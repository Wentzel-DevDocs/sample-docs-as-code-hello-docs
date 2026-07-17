---
title: FAQ
description: Common questions about ports, share-link security, logging, and where hello stores its configuration.
nav_order: 4
---
Answers to the questions that come up most. For flag-level detail, see the [command reference](/commands).

## What happens if the port is already in use?

`hello serve` exits with code `3` and a message naming the busy port. Either pass another port with `--port`, change the `default_port` config key, or free the port - on macOS and Linux, `lsof -i :4040` shows which process holds it.

## Are share links secure?

Reasonably, for what they are. Each link uses a random, unguessable subdomain, traffic is HTTPS end to end through the tunnel, you can require a password with `--password` (HTTP basic auth, username `hello`), and every link expires - two hours by default, 24 hours at most. Treat a share link like an unlisted URL: fine for previews and handoffs, not the place for genuinely sensitive data.

## Does hello upload my files anywhere?

No. `hello share` streams each requested file through the tunnel at request time. Nothing is copied to or stored on the tunnel service, and the moment the share ends - by expiry or `Ctrl+C` - the URL stops working.

## Where is the config file stored?

- macOS and Linux: `~/.config/hello/config.toml`
- Windows: `%APPDATA%\hello\config.toml`

It is plain TOML and safe to edit by hand; `hello config list` shows the effective values.

## How do I see request logs?

`serve` and `share` print an access log line per request to stderr. Add `--log-file <path>` to also append structured JSON lines to a file, which is handy when you want to watch traffic on a long-running share.

## Can I use my own domain for share links?

No. Share URLs are always random subdomains of `hello-tunnel.example`, by design - they are meant to be disposable. If you need a stable address on your own domain, run your app behind your own host or reverse proxy instead.
