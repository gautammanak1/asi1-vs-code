<div align="center">

<img src="assets/fetch-coder-banner.png" alt="Fetch Coder" width="100%" />

<br/><br/>

<p align="center">
  <a href="https://marketplace.visualstudio.com/items?itemName=gautammanak2.fetch-coder">
    <img src="https://img.shields.io/badge/VS%20Marketplace-Install-007ACC?logo=visualstudiocode&logoColor=white" alt="Marketplace" />
  </a>
  <a href="./LICENSE">
    <img src="https://img.shields.io/badge/License-Apache--2.0-green.svg" alt="License" />
  </a>
  <a href="https://api.asi1.ai/">
    <img src="https://img.shields.io/badge/ASI:One-API-7CE074?style=flat" alt="ASI:One" />
  </a>
</p>

<p align="center">
  Your AI coding partner — right inside VS Code.<br/>
  It writes code, debugs, edits files, runs commands, and ships. You stay in control.
</p>

</div>

---

## What is Fetch Coder?

Fetch Coder is an AI coding agent for **VS Code** and **Cursor**, powered by **ASI:One**. It works like a senior engineer sitting next to you — it reads your code, understands context, writes files, runs terminal commands, and iterates until the job is done.

**It can build anything:** landing pages, React apps, Python scripts, REST APIs, CLI tools, games, uAgents, and more.

---

## Quick Start

### 1. Install

Search **"Fetch Coder"** in the VS Code Extensions panel, or install from the [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=gautammanak2.fetch-coder).

### 2. Get your API Key

Go to [asi1.ai/dashboard/api-keys](https://asi1.ai/dashboard/api-keys), create a key, and paste it in the Fetch Coder welcome screen.

### 3. Start building

Open the Fetch Coder sidebar and tell it what to build:

- *"Create a landing page with HTML, CSS, and JS"*
- *"Build a Next.js app with dark mode"*
- *"Write a Python script that scrapes job listings"*
- *"Create a Fetch.ai uAgent with message handling"*
- *"Debug why my API returns 500 errors"*

---

## Features

### Chat & Code Generation
Chat with ASI:One in the sidebar. It streams responses with syntax highlighting, Markdown, and code blocks. Ask it to build, explain, or improve anything.

### File Operations
Fetch Coder reads, writes, creates, and deletes files directly in your workspace. It shows diffs before applying changes — you approve or reject each edit.

### Terminal Commands
It runs terminal commands (npm, git, docker, python, etc.) and reads the output. Long-running commands are handled gracefully.

### Web Search
Toggle the **globe icon** in the chat toolbar to enable real-time web search. Fetch Coder can search the web for up-to-date information while coding.

### Enhance Prompt
Click the **sparkles icon** next to the send button to enhance your prompt. It uses ASI:One to rewrite your prompt for better, more detailed results.

### Plan & Act Modes
- **Plan mode**: Gathers information and designs an approach before coding
- **Act mode**: Executes changes immediately

Toggle with the Plan/Act switch at the bottom of the chat input.

### MCP Servers
Connect to [Model Context Protocol](https://innovationlab.fetch.ai/resources/docs/mcp-integration/what-is-mcp) servers for extended capabilities — databases, APIs, specialized tools. Configure in the MCP settings (server icon in toolbar).

### Checkpoints
Fetch Coder snapshots your code before making changes. If something goes wrong, revert to any previous checkpoint.

### Subagents
For complex tasks, Fetch Coder can spawn parallel subagents to work on different parts simultaneously.

### Browser Testing
Automated browser testing with Puppeteer — Fetch Coder can launch a browser, navigate pages, click elements, and verify UI changes.

### History
Full task history with search. Resume any previous conversation or review what was done.

---

## Settings

### API Key
Set your ASI:One API key in one of these ways:
- **Welcome screen**: Paste it when you first open Fetch Coder
- **Command Palette**: `Cmd+Shift+P` → "Fetch Coder: Set ASI:One API Key"
- **VS Code Settings**: `asiAssistant.apiKey`
- **Environment variable**: `ASI_ONE_API_KEY`

### Model
Fixed to `asi1` — no configuration needed. Endpoint: `https://api.asi1.ai/v1`

### Web Search
Toggle the globe icon in the chat toolbar. When enabled, ASI:One can search the web for current information.

### Auto-approval
Configure which actions Fetch Coder can perform without asking:
- Read files
- Write/edit files
- Run terminal commands
- Use MCP tools

Find these in **Settings → Fetch Coder**.

---

## Toolbar Guide

| Icon | What it does |
|------|-------------|
| **@** | Add context — mention files, folders, URLs |
| **+** | Attach files or images |
| **Globe** | Toggle web search on/off |
| **Server** | Configure MCP servers |
| **Sparkles** | Enhance your prompt with AI |
| **Send** | Send your message |
| **Plan / Act** | Switch between planning and execution modes |

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd+'` (with selection) | Add selected code to Fetch Coder |
| `Cmd+'` (no selection) | Focus chat input |
| `Cmd+Shift+A` | Toggle Plan/Act mode |

---

## Build from Source

```bash
git clone https://github.com/gautammanak1/asi1-vs-code.git
cd asi1-vs-code
npm install
cd webview-ui && npm install && cd ..
npm run protos
npm run build:webview
```

Press **F5** to launch in the Extension Development Host.

---

## Publishing

Bump `version` in `package.json`, commit, then:

```bash
git tag v0.2.6 && git push origin v0.2.6
```

The CI workflows automatically publish to VS Code Marketplace and Open VSX.

**Required GitHub Secrets:**
- `VSCE_PAT` — Azure DevOps PAT for VS Code Marketplace
- `OVSX_PAT` — Open VSX access token

---

## Links

| Resource | URL |
|----------|-----|
| VS Marketplace | [Fetch Coder](https://marketplace.visualstudio.com/items?itemName=gautammanak2.fetch-coder) |
| ASI:One | [asi1.ai](https://asi1.ai) |
| API Keys | [asi1.ai/dashboard/api-keys](https://asi1.ai/dashboard/api-keys) |
| Agentverse | [agentverse.ai](https://agentverse.ai) |
| Fetch.ai Docs | [innovationlab.fetch.ai](https://innovationlab.fetch.ai/resources/docs/intro) |
| GitHub | [gautammanak1/asi1-vs-code](https://github.com/gautammanak1/asi1-vs-code) |

---

## License

Apache-2.0 — see [LICENSE](LICENSE).

<div align="center">

**Built by [Gautam Manak](https://github.com/gautammanak1) · Powered by [ASI:One](https://asi1.ai)**

</div>
