# Contributing to Hullo docs

This repository is a **docs-as-code** sample: Markdown in Git, reviewed by pull request, validated in CI, and published as a versioned artifact.

## Workflow

1. Branch from `main`.
2. Edit pages under `content/` (frontmatter + Markdown body).
3. Run the quality gate locally:

   ```bash
   npm ci
   npm test   # check + dry-run build
   ```

4. Open a pull request using the docs PR template.
5. After merge, CI publishes when `HOSTED_DOCS_PUSH_TOKEN` is configured.

## Frontmatter

Every page needs:

| Field | Required | Purpose |
| --- | --- | --- |
| `title` | yes | Nav and page title |
| `description` | yes | SEO + AI retrieval snippet |
| `order` | yes | Sort within the folder (`index` is always first) |
| `status` | recommended | `stable`, `beta`, or `deprecated` |
| `audience` | recommended | e.g. `developers`, `all` |
| `category` | recommended | Diátaxis-style: `overview`, `tutorial`, `how-to`, `reference`, `concept`, `troubleshooting` |
| `owners` | recommended | Team handle owning the page |
| `last_reviewed` | recommended | ISO date `YYYY-MM-DD` |

## Style

See [STYLEGUIDE.md](./STYLEGUIDE.md). Prefer short paragraphs, copy-pasteable commands, and links to other pages with root-absolute paths (`/installation`).

## What not to commit

- `node_modules/`, `dist/`, secrets, or real push tokens (`hdpt_...`).
