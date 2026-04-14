# Assets

Static images published with the docs site (copied to `assets/` in the broker artifact).

## Rules

1. Prefer SVG for diagrams; PNG/WebP for screenshots.
2. Every Markdown image **must** have meaningful alt text:

   ```md
   ![Hullo serves mock routes from hullo.yaml](/assets/diagrams/hullo-flow.svg)
   ```

3. Filenames are kebab-case; no spaces.
4. Keep diagrams under ~50 KB when possible.
5. Do not commit secrets, PII, or production data in screenshots.

`npm run check` fails on `![](...)` empty alt text and on missing local asset targets.
