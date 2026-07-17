---
title: Installation
description: Install the Hullo CLI with npm, Homebrew, or a standalone binary, then verify, upgrade, or uninstall it.
order: 1
status: stable
audience: developers
category: reference
product: Hullo CLI
owners: docs-platform
last_reviewed: 2026-07-01
---

# Installation

Hullo ships as a single binary with no runtime dependencies. Pick whichever install method fits your machine.

## Requirements

- macOS 12+, Linux (x64 or arm64), or Windows 10+ via WSL.
- The npm method additionally requires Node.js 18 or newer.

## Install with npm

```bash
npm install -g @hullo/cli
```

## Install with Homebrew (macOS and Linux)

```bash
brew tap hullo-cli/tap
brew install hullo
```

## Install a standalone binary

Download the archive for your platform and put the binary on your `PATH`:

```bash
curl -fsSLo hullo.tar.gz https://releases.hullo.example/v1.4.2/hullo-linux-x64.tar.gz
tar -xzf hullo.tar.gz
sudo mv hullo /usr/local/bin/hullo
```

Archives are published for `linux-x64`, `linux-arm64`, `darwin-x64`, and `darwin-arm64`.

## Verify the install

```bash
hullo version
# hullo 1.4.2 (linux-x64)
```

If the command is not found, confirm the directory you installed into is on your `PATH`.

## Upgrade

- npm: `npm install -g @hullo/cli@latest`
- Homebrew: `brew upgrade hullo`
- Binary: download the newer archive and replace the existing binary.

## Uninstall

- npm: `npm uninstall -g @hullo/cli`
- Homebrew: `brew uninstall hullo`
- Binary: delete the `hullo` binary from your `PATH`.
