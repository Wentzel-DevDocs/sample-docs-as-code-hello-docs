---
title: Installation
description: Install the hello binary with Homebrew, the install script, npm, or Scoop, then verify, upgrade, or uninstall it.
nav_order: 1
---
Hello ships as a single static binary for macOS, Linux, and Windows. Pick whichever installer fits your setup - they all put the same `hello` binary on your PATH.

## Homebrew (macOS and Linux)

```bash
brew install hello-cli/tap/hello
```

## Install script (macOS and Linux)

The script detects your operating system and CPU architecture, downloads the right binary, and installs it to `/usr/local/bin`:

```bash
curl -fsSL https://get.hello-cli.example/install.sh | sh
```

Set `HELLO_INSTALL_DIR` to install somewhere else, for example a user-local directory:

```bash
curl -fsSL https://get.hello-cli.example/install.sh | HELLO_INSTALL_DIR="$HOME/.local/bin" sh
```

## npm

If you already have Node.js 18 or newer:

```bash
npm install -g @hello-cli/hello
```

## Scoop (Windows)

```powershell
scoop bucket add hello-cli https://github.com/hello-cli/scoop-bucket
scoop install hello
```

## Verify the install

```bash
hello version
```

You should see the version and platform, for example `hello 1.4.2 (darwin/arm64)`. If the command is not found, make sure the install directory is on your PATH and open a new shell.

## Upgrading

- Homebrew: `brew upgrade hello`
- Install script: re-run the script; it replaces the binary in place
- npm: `npm update -g @hello-cli/hello`
- Scoop: `scoop update hello`

Run `hello version --check` at any time to see whether a newer release exists.

## Uninstalling

Remove the binary with your installer (`brew uninstall hello`, `npm uninstall -g @hello-cli/hello`, `scoop uninstall hello`) or delete it manually. Hello keeps its only state in [one small config file](/faq#where-is-the-config-file-stored), which you can delete too.
