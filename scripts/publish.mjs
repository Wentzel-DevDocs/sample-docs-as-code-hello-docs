#!/usr/bin/env node
/**
 * Build this repo's docs into the hosted.devdocs.ai artifact format and publish
 * them by POSTing a build artifact to the broker push endpoint.
 *
 * Usage:
 *   PUSH_TOKEN=hdpt_... [SLUG=<subdomain>] [VERSION=<string>] node scripts/publish.mjs
 *   DRY_RUN=1 node scripts/publish.mjs     # build only: writes dist/, needs no token
 *
 * Artifacts produced per publish (stored verbatim by the broker):
 *   - manifest.json           site manifest { version, siteTitle, nav }
 *   - <page path>.page.json   pre-rendered page { path, title, description, bodyHtml, toc }
 *   - <page path>.md          verbatim markdown source (served at /<path>.md, feeds AI retrieval)
 *   - llms.txt                only when docs.config.json sets "generateLlmsTxt": true
 *
 * Push contract:
 *   POST https://hosted.devdocs.ai/api/broker/push
 *   Authorization: Bearer <PUSH_TOKEN>
 *   { manifest: { version, generator, entries: [{ path, sha256, size, contentType }] },
 *     files: { "<path>": "<base64 bytes>" } }
 *   Every files key must equal an entry path and vice versa; sha256/size are
 *   verified against the bytes; HTTP 200 auto-publishes the version.
 */

import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { marked } from "marked";
import sanitizeHtml from "sanitize-html";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CONTENT_DIR = path.join(ROOT, "content");
const DIST_DIR = path.join(ROOT, "dist");
const BROKER_URL = "https://hosted.devdocs.ai/api/broker/push";
const GENERATOR = "sample-docs-generator/1.1.0";

const config = JSON.parse(await readFile(path.join(ROOT, "docs.config.json"), "utf8"));

const DRY_RUN = ["1", "true", "yes"].includes(String(process.env.DRY_RUN || "").toLowerCase());
const VERSION =
  process.env.VERSION || process.argv[2] || new Date().toISOString().replace(/[:.]/g, "-");
const SLUG = process.env.SLUG || config.defaultSlug;
const PUSH_TOKEN = process.env.PUSH_TOKEN;

if (!DRY_RUN && !PUSH_TOKEN) {
  console.error("Error: the PUSH_TOKEN env var is required to publish (tokens start with hdpt_).");
  console.error("Tip: run with DRY_RUN=1 to build the artifacts locally without publishing.");
  process.exit(1);
}

/* ------------------------------ markdown helpers ------------------------------ */

marked.use({ gfm: true });

function parseFrontmatter(raw) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!match) return { meta: {}, body: raw };
  const meta = {};
  for (const line of match[1].split(/\r?\n/)) {
    const kv = line.match(/^([A-Za-z_][A-Za-z0-9_-]*):\s*(.*)$/);
    if (!kv) continue;
    let value = kv[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    meta[kv[1]] = value;
  }
  return { meta, body: raw.slice(match[0].length) };
}

function stripInlineMarkdown(text) {
  return text
    .replace(/`([^`]*)`/g, "$1")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[*_]{1,2}([^*_]+)[*_]{1,2}/g, "$1")
    .trim();
}

function firstHeading(body) {
  const m = body.match(/^#\s+(.+)$/m);
  return m ? stripInlineMarkdown(m[1]) : null;
}

function firstParagraph(body) {
  const lines = body.split(/\r?\n/);
  let inCode = false;
  const para = [];
  for (const line of lines) {
    if (line.trim().startsWith("```")) {
      inCode = !inCode;
      continue;
    }
    if (inCode) continue;
    const t = line.trim();
    if (!t) {
      if (para.length) break;
      continue;
    }
    if (/^[#>|-]/.test(t) || /^\d+\./.test(t)) {
      if (para.length) break;
      continue;
    }
    para.push(t);
  }
  const text = stripInlineMarkdown(para.join(" "));
  return text.length > 220 ? text.slice(0, 217).trimEnd() + "..." : text;
}

function titleCase(name) {
  return name
    .split(/[-_]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function slugify(text) {
  const slug = text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-");
  return slug || "section";
}

function decodeEntities(text) {
  return text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");
}

/*
 * bodyHtml is inserted into the reader page as-is, so it must be sanitized:
 * standard prose, headings (ids injected below so toc anchors resolve), lists,
 * tables, links, images, and pre/code are allowed; <script>, <iframe>, inline
 * event handlers and javascript: URLs are stripped.
 */
const SANITIZE_OPTIONS = {
  allowedTags: [
    "h1", "h2", "h3", "h4", "h5", "h6",
    "p", "a", "ul", "ol", "li", "blockquote",
    "pre", "code", "table", "thead", "tbody", "tr", "th", "td",
    "strong", "em", "del", "hr", "br", "img",
  ],
  allowedAttributes: {
    a: ["href", "title"],
    img: ["src", "alt", "title"],
    code: ["class"],
    th: ["align"],
    td: ["align"],
  },
  allowedSchemes: ["https", "http", "mailto"],
  allowProtocolRelative: false,
};

/** Render markdown to sanitized HTML, inject heading ids, and build the toc. */
function renderPage(markdownBody) {
  const sanitized = sanitizeHtml(marked.parse(markdownBody), SANITIZE_OPTIONS);
  const toc = [];
  const used = new Map();
  const bodyHtml = sanitized.replace(/<h([23])>([\s\S]*?)<\/h\1>/g, (_m, level, inner) => {
    const title = decodeEntities(inner.replace(/<[^>]+>/g, "")).trim();
    let id = slugify(title);
    const seen = used.get(id) || 0;
    used.set(id, seen + 1);
    if (seen > 0) id = `${id}-${seen + 1}`;
    toc.push({ title, url: `#${id}`, depth: Number(level) });
    return `<h${level} id="${id}">${inner}</h${level}>`;
  });
  return { bodyHtml, toc };
}

/* --------------------------------- collect pages -------------------------------- */

const SAFE_PATH = /^[a-z0-9][a-z0-9/._-]*$/i;

function assertSafePath(p) {
  if (!SAFE_PATH.test(p) || p.includes("..") || p.startsWith("/") || p.includes("\\")) {
    throw new Error(`Unsafe artifact path: ${p}`);
  }
}

async function walkMarkdown(dir) {
  const found = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) found.push(...(await walkMarkdown(abs)));
    else if (entry.isFile() && entry.name.endsWith(".md")) found.push(abs);
  }
  return found.sort();
}

const mdFiles = await walkMarkdown(CONTENT_DIR);
if (mdFiles.length === 0) {
  console.error("No markdown files found under content/.");
  process.exit(1);
}

const pages = [];
for (const abs of mdFiles) {
  const rel = path.relative(CONTENT_DIR, abs).split(path.sep).join("/");
  const pagePath = rel.replace(/\.md$/, ""); // content/index.md -> "index"
  assertSafePath(pagePath);
  const raw = await readFile(abs, "utf8");
  const { meta, body } = parseFrontmatter(raw);
  const title = meta.title || firstHeading(body) || titleCase(path.posix.basename(pagePath));
  const description = meta.description || firstParagraph(body) || title;
  // The reader renders the page title itself, so drop a leading H1 from the body.
  const { bodyHtml, toc } = renderPage(body.replace(/^\s*#\s+.+\r?\n/, ""));
  const dir = path.posix.dirname(pagePath);
  const enterprise = {};
  for (const key of ["status", "audience", "owners", "last_reviewed", "product", "category"]) {
    if (meta[key] !== undefined && meta[key] !== "") enterprise[key] = meta[key];
  }
  pages.push({
    path: pagePath,
    dir: dir === "." ? "" : dir,
    order: meta.order !== undefined ? Number(meta.order) : Number.POSITIVE_INFINITY,
    title,
    description,
    bodyHtml,
    toc,
    enterprise,
    rawBytes: Buffer.from(raw, "utf8"), // the .md artifact is the verbatim source
  });
}

/* ----------------------------------- build nav ---------------------------------- */

async function readSectionMeta(dirAbs) {
  const p = path.join(dirAbs, "_section.json");
  if (!existsSync(p)) return {};
  try {
    return JSON.parse(await readFile(p, "utf8"));
  } catch {
    return {};
  }
}

function comparePages(a, b) {
  if (a.path === "index") return -1;
  if (b.path === "index") return 1;
  if (a.order !== b.order) return a.order - b.order;
  return a.title.localeCompare(b.title);
}

/** Folders become grouping NavEntries with children; files become leaf NavEntries. */
async function buildNav(dirAbs, dirRel) {
  const nav = pages
    .filter((p) => p.dir === dirRel)
    .sort(comparePages)
    .map((p) => ({ title: p.title, path: p.path }));

  const groups = [];
  for (const entry of await readdir(dirAbs, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const subRel = dirRel ? `${dirRel}/${entry.name}` : entry.name;
    const meta = await readSectionMeta(path.join(dirAbs, entry.name));
    const children = await buildNav(path.join(dirAbs, entry.name), subRel);
    if (children.length === 0) continue;
    groups.push({
      order: meta.order !== undefined ? Number(meta.order) : Number.POSITIVE_INFINITY,
      entry: { title: meta.title || titleCase(entry.name), children },
    });
  }
  groups.sort((a, b) => a.order - b.order || a.entry.title.localeCompare(b.entry.title));
  nav.push(...groups.map((g) => g.entry));
  return nav;
}

const nav = await buildNav(CONTENT_DIR, "");

/* ---------------------------------- llms.txt ------------------------------------ */

function flattenForLlms(entries, trail) {
  const out = [];
  for (const e of entries) {
    if (e.path) {
      const page = pages.find((p) => p.path === e.path);
      if (page) out.push({ trail, page });
    }
    if (e.children) out.push(...flattenForLlms(e.children, [...trail, e.title]));
  }
  return out;
}

function buildLlmsTxt() {
  const lines = [
    `# ${config.siteTitle}`,
    "",
    `> ${config.summary}`,
    "",
    "Every page below is also served as raw Markdown at the same URL with a `.md` suffix.",
    "",
  ];
  const sections = new Map();
  for (const item of flattenForLlms(nav, [])) {
    const section = item.trail[0] || "Overview";
    if (!sections.has(section)) sections.set(section, []);
    sections.get(section).push(item);
  }
  for (const [section, items] of sections) {
    lines.push(`## ${section}`, "");
    for (const { trail, page } of items) {
      const prefix = trail.length > 1 ? `${trail.slice(1).join(" / ")} — ` : "";
      lines.push(
        `- [${prefix}${page.title}](https://${SLUG}.hosted.devdocs.ai/${page.path}.md): ${page.description}`
      );
    }
    lines.push("");
  }
  return lines.join("\n");
}

/* ------------------------------- assemble the push ------------------------------ */

const artifacts = [];
function addArtifact(p, bytes, contentType) {
  assertSafePath(p);
  artifacts.push({ path: p, bytes, contentType });
}

addArtifact(
  "manifest.json",
  Buffer.from(
    JSON.stringify({ version: VERSION, siteTitle: config.siteTitle, nav }, null, 2) + "\n",
    "utf8"
  ),
  "application/json"
);

for (const p of pages) {
  addArtifact(
    `${p.path}.page.json`,
    Buffer.from(
      JSON.stringify(
        {
          path: p.path,
          title: p.title,
          description: p.description,
          bodyHtml: p.bodyHtml,
          toc: p.toc,
          ...(Object.keys(p.enterprise).length ? { meta: p.enterprise } : {}),
        },
        null,
        2
      ) + "\n",
      "utf8"
    ),
    "application/json"
  );
  addArtifact(`${p.path}.md`, p.rawBytes, "text/markdown");
}

if (config.generateLlmsTxt) {
  addArtifact("llms.txt", Buffer.from(buildLlmsTxt(), "utf8"), "text/plain");
}

// Optional non-markdown artifacts (OpenAPI, redirects, etc.) listed in docs.config.json.
for (const item of config.extraArtifacts || []) {
  if (!item?.path || !item?.source) {
    throw new Error("extraArtifacts entries require path and source");
  }
  const abs = path.join(ROOT, item.source);
  if (!existsSync(abs)) throw new Error(`extraArtifact source missing: ${item.source}`);
  const bytes = await readFile(abs);
  addArtifact(item.path, bytes, item.contentType || "application/octet-stream");
}

const entries = artifacts.map((a) => ({
  path: a.path,
  sha256: createHash("sha256").update(a.bytes).digest("hex"), // lowercase hex over the bytes
  size: a.bytes.length,
  contentType: a.contentType,
}));

const pushBody = {
  manifest: { version: VERSION, generator: GENERATOR, entries },
  files: Object.fromEntries(artifacts.map((a) => [a.path, a.bytes.toString("base64")])),
};

const totalBytes = artifacts.reduce((n, a) => n + a.bytes.length, 0);
console.log(
  `Built ${pages.length} pages -> ${artifacts.length} artifacts (${(totalBytes / 1024).toFixed(1)} KiB), version ${VERSION}`
);

/* ------------------------------------ dry run ----------------------------------- */

if (DRY_RUN) {
  await mkdir(DIST_DIR, { recursive: true });
  await writeFile(path.join(DIST_DIR, "push-body.json"), JSON.stringify(pushBody, null, 2));
  for (const a of artifacts) {
    const out = path.join(DIST_DIR, "site", a.path);
    await mkdir(path.dirname(out), { recursive: true });
    await writeFile(out, a.bytes);
  }
  console.log("Dry run: wrote dist/push-body.json and dist/site/ — nothing was published.");
  console.log(`When ready: PUSH_TOKEN=hdpt_... SLUG=${SLUG} node scripts/publish.mjs`);
  process.exit(0);
}

/* ------------------------------------- push ------------------------------------- */

let res;
try {
  res = await fetch(BROKER_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${PUSH_TOKEN}`,
    },
    body: JSON.stringify(pushBody),
  });
} catch (err) {
  console.error(`Push failed: could not reach ${BROKER_URL}: ${err.message}`);
  process.exit(1);
}

const text = await res.text();
if (!res.ok) {
  console.error(`Push failed: HTTP ${res.status}`);
  console.error(text);
  process.exit(1);
}

let result = {};
try {
  result = JSON.parse(text);
} catch {
  /* non-JSON 200 body; still a success */
}

console.log(
  `Push accepted: versionId=${result.versionId ?? "?"} entries=${result.entries ?? "?"} chunksIndexed=${result.chunksIndexed ?? "?"}`
);
if (result.chunksIndexed === 0) {
  console.warn(
    "Warning: chunksIndexed is 0 — the AI retrieval index received no chunks, so grounded answers will be empty."
  );
}
console.log("");
console.log(`Live at: https://${SLUG}.hosted.devdocs.ai`);
console.log(
  `Verify grounding: open the chat widget there and ask e.g. "${config.sampleQuestion}" — the answer should cite these docs.`
);
