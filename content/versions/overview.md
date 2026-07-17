---
title: Versioning strategy
description: How this sample docs-as-code repo models documentation versions for enterprise demos.
order: 1
status: stable
audience: all
category: concept
product: Hullo CLI
owners: docs-platform
last_reviewed: 2026-07-01
---

# Versioning strategy

Enterprise docs programs usually version **product releases** and **doc sets** together.

| Approach | When to use |
| --- | --- |
| Branch per major (`v1`, `v2`) | Long-lived majors with divergent UX |
| Directory per version (`content/versions/...`) | Lightweight demos and migration notes |
| Single `main` + changelog | Continuously deployed SaaS |

This sample keeps a thin [v1 notes](/versions/v1-notes) and [v2 notes](/versions/v2-notes) page so ingestion demos can show multi-version paths without duplicating the entire tree.

The hosted site version id is the **git SHA** (or CI `VERSION`) from each publish.
