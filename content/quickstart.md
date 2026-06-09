---
title: Quickstart
description: Create a Hullo project, start the mock server, call an endpoint, and add a custom route with live reload.
order: 2
status: stable
audience: developers
category: tutorial
product: Hullo CLI
owners: docs-platform
last_reviewed: 2026-06-09
---

# Quickstart

This guide takes you from nothing to a running mock API with a custom route in about two minutes. Install Hullo first if you have not — see [Installation](/installation).

## 1. Create a project

```bash
hullo init demo-api
cd demo-api
```

`hullo init` creates the folder with a starter `hullo.yaml`:

```yaml
port: 4200
routes:
  - path: /hello
    method: GET
    status: 200
    body:
      message: Hello from Hullo!
```

## 2. Start the server

```bash
hullo serve
# hullo 1.4.2 serving 1 route on http://localhost:4200 (watching hullo.yaml)
```

The server watches `hullo.yaml` and reloads automatically when it changes. Stop it with `Ctrl+C`.

## 3. Call your endpoint

```bash
curl -i http://localhost:4200/hello
```

```http
HTTP/1.1 200 OK
content-type: application/json

{"message":"Hello from Hullo!"}
```

## 4. Add a route with a path parameter

Append a second route to `hullo.yaml` while the server is running:

```yaml
  - path: /users/{id}
    method: GET
    status: 200
    latency_ms: 300
    body:
      id: "{{ params.id }}"
      name: Ada Lovelace
```

The server logs `reloaded: 2 routes`, and the new endpoint responds after a 300 ms delay:

```bash
curl http://localhost:4200/users/42
# {"id":"42","name":"Ada Lovelace"}
```

## Next steps

- Browse every flag in the [command reference](/commands).
- Read the full `hullo.yaml` schema in [Configuration](/configuration), including default headers, templating, and serving bodies from files.
