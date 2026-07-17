# sample-hello-docs

The **simple** sample docs-as-code repo for the `hosted.devdocs.ai` multi-tenant docs product:
five flat pages, a single-level nav, and one publish script. The content documents **Hullo**, a
fictional CLI that serves mock HTTP APIs — real, answerable technical prose so the product's
AI assistant can ground its answers in it.

## Repo layout

```
content/            the docs source (markdown with frontmatter: title, description, order)
  index.md          root page (path "index")
  installation.md
  quickstart.md
  commands.md
  configuration.md
scripts/publish.mjs build + publish script (see below)
docs.config.json    site title, default slug, sample verification question
.github/workflows/publish.yml   publishes from CI on push to main
```

## One-time account setup (manual, done in the product)

1. Sign up at `https://hosted.devdocs.ai/signup` and verify the email.
2. Claim a subdomain in the dashboard (for example `helloapi`).
3. Create a **push token** in the dashboard — it starts with `hdpt_` and is shown once.

The token is scoped to the workspace that minted it, and the broker derives the storage path
from the token server-side, so this repo can only ever write its own site.

## Publish

```bash
npm install
PUSH_TOKEN=hdpt_xxx SLUG=<your-subdomain> node scripts/publish.mjs
# or: PUSH_TOKEN=hdpt_xxx SLUG=<your-subdomain> npm run publish
```

- `VERSION` is optional (env var or first CLI arg); it defaults to a timestamp.
- `SLUG` only affects the live URL printed at the end; set `defaultSlug` in `docs.config.json`
  to your claimed subdomain to skip it.
- A successful push (HTTP 200) **automatically becomes the live version** — there is no separate
  activate step. The script prints the broker response (`versionId`, `entries`, `chunksIndexed`)
  and the live URL `https://<slug>.hosted.devdocs.ai`.

After publishing, open the site, then open the chat widget and ask something the docs answer
(for example, "How do I change the port Hullo serves on?") to verify grounded citations.

## Build without publishing (no token needed)

```bash
DRY_RUN=1 node scripts/publish.mjs
```

This writes the exact POST body to `dist/push-body.json` and unpacks every artifact under
`dist/site/` (`manifest.json`, `*.page.json`, `*.md`) so you can inspect what a publish would send.

## Publish from CI (the intended model)

Your own CI publishes. Add the push token as a repo secret named `HOSTED_DOCS_PUSH_TOKEN`;
the included workflow (`.github/workflows/publish.yml`) then builds and publishes on every push
to `main`, using the git SHA as the version.

## How the artifact format works

Each publish POSTs `{ manifest, files }` to `https://hosted.devdocs.ai/api/broker/push` with
`Authorization: Bearer <PUSH_TOKEN>`. `manifest.entries` lists every file with its lowercase hex
`sha256` and byte `size` (verified server-side); `files` maps the same paths to base64 bytes.
The artifacts themselves are:

- exactly one `manifest.json` — `{ version, siteTitle, nav }`, nav built from the folder structure;
- `<path>.page.json` per page — `{ path, title, description, bodyHtml, toc }`, where `bodyHtml`
  is sanitized static HTML with id anchors matching the `toc` entries;
- `<path>.md` per page — the verbatim markdown source, served at `/<path>.md` and used to build
  the AI retrieval index.

The root page's path is exactly `index` (from `content/index.md`).

## Editing content

Every page is a markdown file under `content/` with frontmatter:

```yaml
---
title: Quickstart          # nav + page title (falls back to the first H1)
description: One sentence. # used for the page and retrieval (falls back to the first paragraph)
order: 2                   # nav position within its folder (index always sorts first)
---
```

Folders become nav groups; an optional `_section.json` (`{ "title": "...", "order": 1 }`) in a
folder names and orders the group. This repo is intentionally flat, so it has none.
