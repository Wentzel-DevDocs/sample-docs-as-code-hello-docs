---
title: Commands
description: Reference for every Hullo subcommand — init, serve, routes, check, and version — with their flags and defaults.
order: 3
---

# Commands

The CLI is invoked as `hullo <command> [flags]`.

| Command | Purpose |
| --- | --- |
| `hullo init [dir]` | Scaffold a new project with a starter `hullo.yaml` |
| `hullo serve` | Start the mock server |
| `hullo routes` | Print the routes the current config defines |
| `hullo check` | Validate the config file without starting a server |
| `hullo version` | Print the CLI version and platform |

## hullo init

Creates the target directory (default: the current directory) and writes a starter `hullo.yaml`. It fails rather than overwriting an existing config.

```bash
hullo init demo-api
```

## hullo serve

Starts the mock server and watches the config file for changes.

| Flag | Default | Description |
| --- | --- | --- |
| `-p, --port <n>` | `4200` | Port to listen on; overrides the config file and `HULLO_PORT` |
| `-c, --config <file>` | `./hullo.yaml` | Path to the config file |
| `--no-watch` | watch on | Disable live reload |
| `--latency <ms>` | `0` | Add a global delay to every response, on top of per-route latency |
| `--quiet` | off | Suppress per-request log lines |

## hullo routes

Prints a table of the configured routes (method, path, status, latency). Useful as a quick sanity check of a large config.

## hullo check

Parses and validates the config, printing each problem with its line number. It exits non-zero when the config is invalid, which makes it convenient to run in CI.

```bash
hullo check
# hullo.yaml:12 route /users/{id}: "status" must be an integer between 100 and 599
```

## hullo version

Prints the version and platform, for example `hullo 1.4.2 (darwin-arm64)`.

## Precedence

For any setting that can come from several places, the order is: command-line flag, then environment variable, then `hullo.yaml`, then the built-in default. See [Configuration](/configuration#environment-variables) for the supported environment variables.
