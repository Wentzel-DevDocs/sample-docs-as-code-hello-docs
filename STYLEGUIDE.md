# Style guide (Hullo sample)

Lightweight writing standards for this sample repo. Enterprise teams typically back this with Vale or a corporate style pack.

## Voice

- Second person ("you"), present tense, active voice.
- Prefer "run" over "simply run"; avoid filler.

## Structure

- One H1 that matches or closely matches `title`.
- H2 for major sections; H3 sparingly.
- Lead with the task outcome, then steps.

## Code

- Fence every command and config sample with a language tag (`bash`, `yaml`, `json`).
- Show expected output when it helps verify success.
- Never put real secrets in samples; use placeholders like `ak_test_...`.

## Links

- Internal: `/path` (no `.md` suffix).
- Prefer linking to the canonical page instead of duplicating reference tables.

## Checks

`npm run check` enforces frontmatter and internal links. `npm run build` produces the publish artifact under `dist/`.
