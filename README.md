<div align="center">

# Fetch Coder

### AI Coding Agent for VS Code & Cursor · Powered by ASI:One

<p align="center">
  <a href="https://marketplace.visualstudio.com/items?itemName=gautammanak2.fetch-coder">
    <img src="https://img.shields.io/badge/VS%20Marketplace-Install-007ACC?logo=visualstudiocode&logoColor=white" alt="Marketplace" />
  </a>
  <a href="./LICENSE">
    <img src="https://img.shields.io/badge/License-Apache--2.0-green.svg" alt="License" />
  </a>
  <a href="https://code.visualstudio.com/">
    <img src="https://img.shields.io/badge/VS%20Code-1.84+-007ACC?logo=visualstudiocode&logoColor=white" alt="VS Code" />
  </a>
  <a href="https://github.com/gautammanak1/asi1-vs-code/actions/workflows/ci.yml">
    <img src="https://github.com/gautammanak1/asi1-vs-code/actions/workflows/ci.yml/badge.svg" alt="CI" />
  </a>
  <a href="https://api.asi1.ai/">
    <img src="https://img.shields.io/badge/ASI1-API-6366f1?style=flat" alt="ASI1 API" />
  </a>
  <a href="https://www.fetch.ai/">
    <img src="https://img.shields.io/badge/Fetch.ai-Ecosystem-0891b2?style=flat" alt="Fetch.ai" />
  </a>
</p>

<p align="center">
  An autonomous coding agent that lives inside your editor.<br/>
  Chat, generate code, edit files, run terminal commands, and ship — all powered by ASI:One.
</p>

</div>

---

## Overview

Fetch Coder is an AI-powered coding **agent** built for **VS Code** and **Cursor** using the **ASI1 API** (`https://api.asi1.ai/v1`, model `asi1`).

It gives you a full agent loop right inside the editor:

- **Chat** with the AI and get streaming responses
- **Edit files** directly — the agent reads, writes, and diffs your code
- **Run terminal commands** (npm, git, docker, etc.)
- **MCP servers** for extending capabilities
- **Checkpoints** to snapshot and revert changes
- **Plan & Act modes** for thoughtful multi-step work
- **Subagents** for parallelizing complex tasks
- **Browser integration** for web-based testing

**Extension ID:** `gautammanak2.fetch-coder`

---

## Features

| Area | What you get |
|------|--------------|
| **Chat** | Sidebar panel, streaming, Markdown, syntax-highlighted code blocks |
| **Agent Tools** | Read/write files, search, list files, run terminal commands |
| **MCP** | Connect to Model Context Protocol servers for extended capabilities |
| **Plan & Act** | Separate planning and execution modes |
| **Checkpoints** | Snapshot before changes, revert when needed |
| **Subagents** | Parallel task execution for complex work |
| **Browser** | Automated browser testing and web interaction |
| **Focus Chain** | Track task progress with structured to-do lists |
| **History** | Full task history with search and filtering |
| **Hooks** | Custom scripts that run on agent events |

---

## Installation

### From VS Code Marketplace

```
https://marketplace.visualstudio.com/items?itemName=gautammanak2.fetch-coder
```

Or search for **"Fetch Coder"** in the Extensions panel.

### From Source

```bash
git clone https://github.com/gautammanak1/asi1-vs-code.git
cd asi1-vs-code
npm install
npm run protos
npm run build:webview
```

Press **F5** to launch the Extension Development Host.

### Package as VSIX

```bash
npx @vscode/vsce package --no-dependencies
```

---

## Getting Started

### 1. Set your API key

Open settings and add your ASI:One API key. Or set the environment variable:

```bash
export ASI_ONE_API_KEY=your_api_key
```

The base URL (`https://api.asi1.ai/v1`) and model (`asi1`) are preconfigured.

### 2. Open the chat panel

Use the sidebar icon or the command palette to open the Fetch Coder panel and start chatting.

---

## Repository Layout

| Path | Purpose |
|------|---------|
| `src/core/` | Task loop, API handler (ASI:One via OpenAI SDK), tools, prompts, storage |
| `src/shared/` | Shared types, API types, proto definitions |
| `src/integrations/` | Terminal, editor/diff, diagnostics, notifications |
| `src/services/` | MCP hub, search, browser session, tree-sitter parsing |
| `src/hosts/` | VS Code host abstraction, terminal manager, webview helpers |
| `webview-ui/` | React + Vite + Tailwind chat UI |
| `proto/` | Protocol Buffer definitions for gRPC communication |
| `cli/` | CLI version of Fetch Coder |
| `.github/workflows/` | CI, publish to VS Marketplace, publish to Open VSX |

---

## GitHub Secrets (for CI/CD)

To use the publish workflows, add these secrets in your GitHub repo settings (**Settings → Secrets and variables → Actions**):

| Secret | Purpose | Where to get it |
|--------|---------|-----------------|
| `VSCE_PAT` | Publish to VS Code Marketplace | [Azure DevOps](https://dev.azure.com/) → Personal Access Tokens → scope: **Marketplace → Manage** (same Microsoft account as publisher `gautammanak2`) |
| `OVSX_PAT` | Publish to Open VSX (for Cursor) | [Open VSX](https://open-vsx.org/) → User Settings → Access Tokens |

### Workflow triggers

| Workflow | Trigger |
|----------|---------|
| `ci.yml` | Push/PR to `main` or `master` |
| `publish-extension.yml` | Tag push (`v*`), GitHub Release, or manual dispatch |
| `publish-openvsx.yml` | Tag push (`v*`), GitHub Release, or manual dispatch |

### Publishing a new version

1. Bump `"version"` in `package.json`
2. Commit and push to `main`
3. Create a git tag: `git tag v0.2.1 && git push origin v0.2.1`
4. The publish workflows will automatically build and publish

---

## Documentation Links

| Resource | URL |
|----------|-----|
| ASI1 API | [api.asi1.ai](https://api.asi1.ai/) |
| Fetch.ai | [fetch.ai](https://www.fetch.ai/) |
| ASI:One Docs | [docs.fetch.ai](https://docs.fetch.ai) |
| VS Marketplace | [Fetch Coder](https://marketplace.visualstudio.com/items?itemName=gautammanak2.fetch-coder) |
| GitHub | [gautammanak1/asi1-vs-code](https://github.com/gautammanak1/asi1-vs-code) |

---

## License

Apache-2.0 — see [LICENSE](LICENSE).

---

<div align="center">

### Built with ❤️ by Gautam Manak

If you like this project, give it a ⭐ on [GitHub](https://github.com/gautammanak1/asi1-vs-code).

</div>
