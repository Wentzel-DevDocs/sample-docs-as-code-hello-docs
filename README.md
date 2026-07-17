# sample-hello-docs

**Simple** enterprise docs-as-code sample for [hosted.devdocs.ai](https://hosted.devdocs.ai) multi-tenant docs product.

Five flat pages document **Hullo**, a fictional CLI that serves mock HTTP APIs. Use this repo when you want the smallest realistic ingestion demo: Markdown in Git, PR review, CI quality gates, and a broker push publish.

| Scale | Nav | Pages | Extra artifacts |
| --- | --- | ---: | --- |
| Simple | Flat | 5 | `llms.txt` |

## Why this looks like an enterprise docs repo

- Markdown source under `content/` with structured frontmatter
- `docs.config.json` as the single site config
- Local quality gate (`npm run check`) + dry-run build (`npm run build`)
- GitHub Actions for PR checks and main-branch publish
- `CODEOWNERS`, docs PR template, `CONTRIBUTING.md`, `STYLEGUIDE.md`
- Enterprise metadata on every page (`status`, `audience`, `owners`, `last_reviewed`, …)
- Generated `llms.txt` for AI/tooling discovery

## Repo layout

```
content/                 docs source (Markdown + frontmatter)
docs.config.json         site title, slug, sample question, llms.txt flag
scripts/check.mjs        frontmatter + internal link gate
scripts/publish.mjs      build artifacts + optional broker push
.github/workflows/       docs-quality.yml, publish.yml
.github/CODEOWNERS
.github/PULL_REQUEST_TEMPLATE/docs.md
CONTRIBUTING.md
STYLEGUIDE.md
LICENSE
```

## Frontmatter contract

```yaml
---
title: Quickstart
description: One or two sentences for nav, SEO, and retrieval.
order: 2
status: stable              # stable | beta | deprecated
audience: developers        # developers | all | ...
category: tutorial          # overview | tutorial | how-to | reference | ...
product: Hullo CLI
owners: docs-platform
last_reviewed: 2026-07-01
---
```

## Local workflow

```bash
npm ci
npm test                  # check + dry-run build (writes dist/)
# Publish (optional):
PUSH_TOKEN=hdpt_xxx SLUG=helloapi npm run publish
```

## One-time product setup

1. Sign up at `https://hosted.devdocs.ai/signup` and verify email.
2. Claim a subdomain (for example `helloapi`).
3. Create a push token (`hdpt_...`) and store it as `HOSTED_DOCS_PUSH_TOKEN` for CI.

A successful push becomes live automatically at `https://<slug>.hosted.devdocs.ai`.

## Verify after publish

Open the chat widget and ask: **How do I change the port Hullo serves on?**

## Related samples

| Repo | Intent |
| --- | --- |
| [sample-docs-as-code-hello-docs](https://github.com/Wentzel-DevDocs/sample-docs-as-code-hello-docs) | Simple / flat |
| [sample-docs-as-code-acme-api](https://github.com/Wentzel-DevDocs/sample-docs-as-code-acme-api) | Medium / API + OpenAPI |
| [sample-docs-as-code-nimbus-platform](https://github.com/Wentzel-DevDocs/sample-docs-as-code-nimbus-platform) | Complex / multi-section platform |
