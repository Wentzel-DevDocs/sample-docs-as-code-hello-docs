---
title: Configuration
description: The complete hullo.yaml reference — top-level keys, route fields, templating, body files, defaults, and environment variable overrides.
order: 4
status: stable
audience: developers
category: reference
product: Hullo CLI
owners: docs-platform
last_reviewed: 2026-06-09
---

# Configuration

Hullo reads a single YAML file, `hullo.yaml` by default. Point it elsewhere with `hullo serve --config path/to/file.yaml` or the `HULLO_CONFIG` environment variable.

## Top-level keys

| Key | Type | Default | Description |
| --- | --- | --- | --- |
| `port` | integer | `4200` | Port the server listens on |
| `defaults` | object | — | Values applied to every route unless the route overrides them |
| `routes` | list | required | The endpoints to serve |

## Defaults

Anything set under `defaults` applies to every route that does not set the same field itself:

```yaml
defaults:
  status: 200
  latency_ms: 0
  headers:
    content-type: application/json
```

## Route fields

| Field | Type | Default | Description |
| --- | --- | --- | --- |
| `path` | string | required | URL path; segments in braces such as `/users/{id}` become parameters |
| `method` | string | `GET` | HTTP method to match: `GET`, `POST`, `PUT`, `PATCH`, or `DELETE` |
| `status` | integer | `200` | HTTP status code to return |
| `body` | any | — | Inline response body; maps and lists are serialized as JSON |
| `body_file` | string | — | Path to a file (relative to the config) whose contents become the body; mutually exclusive with `body` |
| `headers` | map | — | Response headers, merged over `defaults.headers` |
| `latency_ms` | integer | `0` | Delay before responding, in milliseconds |

## Templating

String values inside `body` may reference request data with double braces:

- `{{ params.<name> }}` — a path parameter, such as `{id}` from the route path.
- `{{ query.<name> }}` — a query-string value.

```yaml
routes:
  - path: /search
    body:
      query: "{{ query.q }}"
      results: []
```

## Serving a body from a file

Use `body_file` when a response is large or shared between projects:

```yaml
routes:
  - path: /report
    body_file: fixtures/report.json
    headers:
      content-type: application/json
```

## Environment variables

| Variable | Overrides |
| --- | --- |
| `HULLO_PORT` | `port` |
| `HULLO_CONFIG` | The config file path |

Command-line flags always win over environment variables; see [precedence](/commands#precedence) for the full order.
