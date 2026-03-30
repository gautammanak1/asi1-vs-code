<div align="center">

![ASI1 Code — sidebar AI chat for VS Code](./resources/readme-banner.png)

<br/>

[![CI](https://github.com/gautammanak1/asi1-vs-code/actions/workflows/ci.yml/badge.svg)](https://github.com/gautammanak1/asi1-vs-code/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)
[![VS Code](https://img.shields.io/badge/VS%20Code-1.85+-007ACC?logo=visualstudiocode&logoColor=white)](https://code.visualstudio.com/)
[![Marketplace](https://img.shields.io/badge/VS%20Marketplace-Install-007ACC?logo=visualstudiocode&logoColor=white)](https://marketplace.visualstudio.com/items?itemName=gautammanak2.asi1-code)

**Sidebar AI chat powered by [ASI1](https://api.asi1.ai)** · Works in **VS Code** and **Cursor**

`gautammanak2.asi1-code` · Engine **^1.85.0**

</div>

<br/>

## Overview

**ASI1 Code** adds an activity-bar **Chat** panel that talks to the ASI1 API: **streaming** replies, **Markdown** + syntax-highlighted code, and optional **file writes** into your open folder. The in-chat banner can link to **Website**, **Docs**, **X**, **Community**, **Resources**, **Support**, and **Contact** (all configurable).

| | |
| :--- | :--- |
| **Use case** | Plan features, debug errors, generate code, apply “Save as …” hints in the workspace |
| **API** | [ASI1 chat completions](https://api.asi1.ai) — set key via command, settings, or `ASI_ONE_API_KEY` |

<br/>

## Features

- **Streaming** responses (SSE); turn off in settings if your network returns JSON only  
- **GFM Markdown** in replies, **Highlight.js** for fenced code blocks  
- **Workspace hints** — parse paths / “Save as” and optionally **auto-apply** files  
- **Banner links** — Fetch.ai / docs / community URLs from settings (`asiAssistant.link*`)

<br/>

## Quick start

1. **Install** — [Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=gautammanak2.asi1-code) or a local `.vsix` (see below).  
2. **API key** — Command Palette → **ASI: Set API Key**, or `asiAssistant.apiKey`, or env `ASI_ONE_API_KEY`.  
3. **Open chat** — Activity bar → **ASI1 Code** → **Chat**, or **ASI: Open Assistant Chat** (`Ctrl+Shift+;` / `Cmd+Shift+;` on Mac).  
4. **Open a folder** if you want files written into the project.

<br/>

## Commands

| ID | Title | Shortcut |
|----|--------|----------|
| `asiAssistant.openChat` | ASI: Open Assistant Chat | `Ctrl+Shift+;` / `Cmd+Shift+;` |
| `asiAssistant.askAboutSelection` | ASI: Ask About Selection | — |
| `asiAssistant.insertApiKey` | ASI: Set API Key | — |
| `asiAssistant.installFromVsix` | ASI: Install Extension from .vsix | — |

<br/>

## Settings

Prefix **`asiAssistant.*`** (see **Settings → ASI1 Code**).

| Setting | Purpose |
|---------|---------|
| `apiKey` | ASI1 API key |
| `baseUrl` / `model` | Endpoint and model id |
| `streamResponse` | Enable SSE streaming |
| `autoApplyFiles` | Auto-write detected files after replies |
| `bannerTitle` / `bannerSubtitle` | Banner text |
| `linkWebsite` … `linkContact` | Banner URL chips |

<br/>

## Build & install from `.vsix`

```bash
npm install
npm run compile
npm run package
```

Then **Extensions: Install from VSIX…** and select `asi1-code-<version>.vsix`, or:

```bash
code --install-extension ./asi1-code-0.0.2.vsix
```

<br/>

## Changelog

See [CHANGELOG.md](./CHANGELOG.md) and [GitHub Releases](https://github.com/gautammanak1/asi1-vs-code/releases).

<br/>

## Contributing · Security · License

- [CONTRIBUTING.md](./CONTRIBUTING.md)  
- [SECURITY.md](./SECURITY.md)  
- [MIT License](./LICENSE) — © 2026 Gautam Manak and contributors
