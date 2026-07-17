#!/usr/bin/env node
/**
 * Enterprise docs quality gate (no network).
 * Validates frontmatter, section metadata, and internal links under content/.
 */
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CONTENT_DIR = path.join(ROOT, "content");
const errors = [];
const warnings = [];

function fail(msg) {
  errors.push(msg);
}
function warn(msg) {
  warnings.push(msg);
}

function parseFrontmatter(raw) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!match) return { meta: {}, body: raw, hasFm: false };
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
  return { meta, body: raw.slice(match[0].length), hasFm: true };
}

async function walk(dir) {
  const found = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) found.push(...(await walk(abs)));
    else if (entry.isFile()) found.push(abs);
  }
  return found;
}

const files = await walk(CONTENT_DIR);
const mdFiles = files.filter((f) => f.endsWith(".md"));
const pages = new Set(
  mdFiles.map((f) => path.relative(CONTENT_DIR, f).split(path.sep).join("/").replace(/\.md$/, ""))
);

if (mdFiles.length === 0) fail("No markdown files under content/");
if (!pages.has("index")) fail('Missing content/index.md (root page path must be "index")');

const orderByDir = new Map();

for (const abs of mdFiles) {
  const rel = path.relative(CONTENT_DIR, abs).split(path.sep).join("/");
  const pagePath = rel.replace(/\.md$/, "");
  const raw = await readFile(abs, "utf8");
  const { meta, body, hasFm } = parseFrontmatter(raw);

  if (!hasFm) fail(`${rel}: missing YAML frontmatter`);
  if (!meta.title) fail(`${rel}: missing required frontmatter field "title"`);
  if (!meta.description) fail(`${rel}: missing required frontmatter field "description"`);
  if (meta.order === undefined) fail(`${rel}: missing required frontmatter field "order"`);
  if (meta.nav_order !== undefined) {
    fail(`${rel}: uses deprecated "nav_order" — use "order" instead`);
  }
  if (meta.order !== undefined && Number.isNaN(Number(meta.order))) {
    fail(`${rel}: "order" must be a number`);
  }
  if (meta.description && meta.description.length > 280) {
    warn(`${rel}: description is long (${meta.description.length} chars); keep under ~220 for retrieval snippets`);
  }
  if (!body.trim()) fail(`${rel}: empty body after frontmatter`);
  if (!/^#\s+\S/m.test(body)) warn(`${rel}: no H1 heading found (recommended for page body)`);

  // Enterprise metadata — recommended, not required (hello stays lean)
  for (const field of ["status", "audience"]) {
    if (!meta[field]) warn(`${rel}: optional enterprise field "${field}" not set`);
  }

  const dir = path.posix.dirname(pagePath);
  const dirKey = dir === "." ? "" : dir;
  if (!orderByDir.has(dirKey)) orderByDir.set(dirKey, new Map());
  const orders = orderByDir.get(dirKey);
  const orderNum = Number(meta.order);
  if (orders.has(orderNum) && pagePath !== "index") {
    warn(`${rel}: duplicate order ${orderNum} in ${dirKey || "/"} (also ${orders.get(orderNum)})`);
  }
  orders.set(orderNum, pagePath);

  // Internal links
  const linkRe = /\]\((\/[^)#\s]+)(?:#[^)]*)?\)/g;
  let m;
  while ((m = linkRe.exec(body)) !== null) {
    let target = m[1].replace(/^\//, "").replace(/\.md$/, "");
    if (target === "" || target === "index") target = "index";
    if (!pages.has(target)) fail(`${rel}: broken internal link /${target}`);
  }
}

// _section.json present for every non-empty folder that has pages
const dirsWithPages = new Set(
  [...pages].map((p) => {
    const d = path.posix.dirname(p);
    return d === "." ? "" : d;
  })
);
for (const dir of dirsWithPages) {
  if (!dir) continue;
  const sectionPath = path.join(CONTENT_DIR, ...dir.split("/"), "_section.json");
  try {
    const section = JSON.parse(await readFile(sectionPath, "utf8"));
    if (!section.title) fail(`${dir}/_section.json: missing "title"`);
    if (section.order === undefined) warn(`${dir}/_section.json: missing "order"`);
  } catch {
    // Nested folders should have _section.json for nav groups
    fail(`${dir}/_section.json: missing (required for nav groups)`);
  }
}

// docs.config.json
try {
  const cfg = JSON.parse(await readFile(path.join(ROOT, "docs.config.json"), "utf8"));
  for (const key of ["siteTitle", "defaultSlug", "summary", "sampleQuestion"]) {
    if (!cfg[key]) fail(`docs.config.json: missing "${key}"`);
  }
} catch (e) {
  fail(`docs.config.json: ${e.message}`);
}

console.log(`Checked ${mdFiles.length} pages under content/`);
for (const w of warnings) console.warn(`  warn: ${w}`);
if (errors.length) {
  console.error(`\n${errors.length} error(s):`);
  for (const e of errors) console.error(`  error: ${e}`);
  process.exit(1);
}
console.log(warnings.length ? `OK with ${warnings.length} warning(s)` : "OK");
