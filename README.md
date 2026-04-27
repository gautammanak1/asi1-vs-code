<div align="center">

![Fetch Coder](assets/fetch-coder-banner.png)

# 🚀 Fetch Coder for Cursor

**Autonomous AI coding in Cursor or VS Code — powered by ASI:One**

[![VS Marketplace](https://img.shields.io/badge/VS%20Marketplace-Install-007ACC?logo=visualstudiocode&logoColor=white)](https://marketplace.visualstudio.com/items?itemName=gautammanak2.fetch-coder)
[![License: Apache 2.0](https://img.shields.io/badge/License-Apache--2.0-green.svg)](LICENSE)
[![Powered by asi1.ai](https://img.shields.io/badge/Powered%20by-asi1.ai-0052FF?style=flat-square)](https://asi1.ai)
[![Discord](https://img.shields.io/badge/Discord-Join-5865F2?logo=discord&logoColor=white)](https://discord.gg/fetchai)
[![Release v0.2.21](https://img.shields.io/badge/release-v0.2.21-0052FF?style=flat-square)](https://github.com/gautammanak1/asi1-vs-code/releases/tag/v0.2.21)

<p>Install from the **VS Code Marketplace** or **Open VSX**; the same VSIX and marketplace listing work in <strong>Cursor</strong> (Anysphere) because Cursor loads standard VS Code extensions. Use the Activity Bar or <strong>View → Extensions</strong> to find <strong>Fetch Coder for Cursor</strong>.</p>

<p align="center"><sub>Current extension version: <strong>0.2.21</strong> · Git tag: <a href="https://github.com/gautammanak1/asi1-vs-code/releases/tag/v0.2.21"><code>v0.2.21</code></a></sub></p>

<p align="center"><sub><strong>Marketplace note:</strong> VS Code Marketplace, Open VSX, and Cursor use this <code>README.md</code> from the repo root. Keep it aligned with the <code>description</code> field in <code>package.json</code> so store listings stay consistent.</sub></p>

</div>

**Contents** · [What is Fetch Coder?](#what-is-fetch-coder) · [Quick start](#quick-start) · [Features](#features) · [Configuration](#configuration) · [Keyboard shortcuts](#keyboard-shortcuts) · [Toolbar guide](#toolbar-guide) · [Install from source](#installation-from-source) · [Documentation](#documentation) · [Resources](#resources) · [Store listings and releases](#store-listings-and-releases) · [License](#license)

---

## 🎯 What is Fetch Coder?

Fetch Coder is an **autonomous AI coding agent** for **VS Code and Cursor**, powered by **ASI:One** (OpenAI-compatible API at `https://api.asi1.ai/v1`). It plans and executes changes in your repo: read files, run terminal commands, and iterate until the task is done.

### Perfect for:
- 🏗️ Building full-stack applications from scratch
- 🐛 Debugging complex issues across your codebase
- 📝 Refactoring and optimizing code
- 🔧 DevOps tasks (Docker, Kubernetes, CI/CD)
- 🤖 Creating autonomous agents and AI systems
- 📚 Learning new frameworks and technologies

---

## ⚡ Quick Start

### 1️⃣ Install

Search **"Fetch Coder"** in the Extensions view (**Cursor** or **VS Code**), or [install from VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=gautammanak2.fetch-coder).

### 2️⃣ Get API Access

1. Open the **[ASI:One developer portal](https://asi1.ai/developer?utm_source=vscode&utm_medium=aff&utm_campaign=india2026)** (create and manage API keys).
2. Optionally follow the **[API quickstart](https://docs.asi1.ai/documentation/getting-started/quickstart)**.
3. Paste the key in Fetch Coder’s welcome screen or **Settings → API Configuration**.

### 3️⃣ Start Building

Open the Fetch Coder sidebar and describe what you need:

```
"Create a modern landing page with animations and dark mode"
"Build a REST API with authentication and database"
"Debug my React app's performance issues"
"Write tests for my Python module"
"Set up Docker, GitHub Actions, and deployment"
```

---

## ✨ Features

### 💬 **Intelligent Chat**
Chat with asi1.ai naturally. It understands your code, explains problems, suggests improvements, and executes changes—all in real-time with streaming responses.

### 🎨 **Beautiful Welcome Screen**
- **asi1.ai logo & branding** prominently displayed
- Gradient text headers with modern design
- Quick-start suggested tasks with icons
- Get started immediately with pre-built examples
- Settings quick access for prompt customization

### 📝 **Smart Code Generation**
- Write new features
- Fix bugs automatically
- Refactor existing code
- Generate tests and documentation
- Create full applications

### 🗂️ **File Management**
- Read and analyze files
- Create new files and folders
- Modify multiple files at once
- See diffs before applying changes
- Auto-rollback if something breaks

### 💻 **Terminal Integration**
Run any terminal command and read output:
- `npm install`, `git commit`, `docker build`
- Python, Node.js, bash scripts
- Database migrations
- Long-running processes with streaming output

### 🔍 **Web Search**
Toggle the **globe icon** to enable real-time web search. Fetch Coder can research current best practices, APIs, and solutions while coding.

### ✨ **Prompt Enhancement**
Click the **sparkles icon** to let ASI:One rewrite your prompt for better results with more details and clarity.

### 📊 **Plan & Act Modes**
- **Plan Mode**: Analyze the problem, gather info, design a solution
- **Act Mode**: Execute changes immediately

Toggle with the **Plan/Act** switch in the chat input.

### 🔌 **MCP Server Support**
Connect to specialized tools and services via [Model Context Protocol](https://spec.modelcontextprotocol.io/):
- Databases (PostgreSQL, MongoDB, etc.)
- APIs and integrations
- Custom tools and services
- Real-time data access

### 💾 **Checkpoints & History**
- Auto-save checkpoints before changes
- Revert to any previous state
- Full task history with search
- Resume interrupted conversations

### 🤖 **Subagents**
For complex tasks, spawn parallel subagents to work on different parts simultaneously—faster development.

### 🌐 **Browser Automation**
Automated testing and interaction:
- Launch headless browser
- Navigate and click elements
- Fill forms, submit data
- Verify UI changes

---

## 🛠️ Configuration

### **Branding (optional Cursor-style accents)**

- Settings → search **`fetchCoder.brandTheme`**: **`cursor-accent`** (default) uses blue/cyan marketing accents; **`host`** uses the classic ASI blue/lime. Editor colors still follow your theme via VS Code tokens.
- Optional: **`fetchCoder.hostApp`**: **`auto`** (use `vscode.env.appName`), **`vscode`**, or **`cursor`** to fix wrong host detection for placeholders and welcome copy. This does not integrate with the editor’s native chat.

### **Extra system instructions**

- Settings → **`fetchCoder.extraSystemPrompt`**: optional text appended to the built-in system prompt on every model request (max length enforced in the extension).

### API Key Setup (Choose one)

**Option 1: Welcome Screen** (Recommended)
- Paste when Fetch Coder first opens

**Option 2: Command Palette**
```
Cmd+Shift+P → "Fetch Coder: Set ASI:One API Key & Base URL" (or "ASI: Set API Key")
```

**Option 3: VS Code Settings (synced to ASI:One)**
```json
{
  "asiAssistant.apiKey": "your-api-key-here",
  "asiAssistant.baseUrl": "https://api.asi1.ai/v1",
  "asiAssistant.model": "asi1"
}
```

**Option 4: Environment variable**
```bash
export ASI_ONE_API_KEY="your-api-key-here"
```

### Model & endpoint (ASI:One)

- **Base URL** (one OpenAI-compatible endpoint for chat): `https://api.asi1.ai/v1` — override with `asiAssistant.baseUrl` if your deployment differs.
- **Model** (dropdown in the extension, synced from `asiAssistant.model`): `asi1-ultra`, `asi1`, or `asi1-mini` (default: `asi1`).

### Privacy & security

- Your project files are processed locally; API requests for completions are sent to the ASI:One endpoint you configure.
- **Optional telemetry** — In **Fetch Coder → Settings → General**, **Allow error and usage reporting** toggles aggregated usage and diagnostics. When unchecked, reporting is suppressed. The in-extension description lists what may be collected; **code, prompts, and personal information are not sent** in that stream.
- **Editor telemetry** — VS Code’s **Telemetry: Telemetry Level** (or Cursor’s equivalent) can also disable client-side reporting that extensions depend on.
- For extension log output, use **View → Output** and choose the **`Asi`** channel in the dropdown.

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| **Cmd+`** (Mac) / **Ctrl+`** (Win/Linux) | **Add selection to chat** when text is selected; **focus chat** when there is no selection |
| **Cmd+Shift+A** (Mac) / **Ctrl+Shift+A** (Win/Linux) | **Focus chat** (no selection) — secondary chord alongside **Cmd+'** |
| **Cmd+Shift+Z** (Mac) / **Ctrl+Shift+Z** (Win/Linux) | **Revert last change** (Fetch Coder / Asi) |
| **Enter** (when a Fetch Coder **AI review** comment box is focused) | Submit the **Reply** in that review thread |
| **Command Palette** → `Fetch Coder: Attach File to Fetch Coder Chat` | Pick a file; path + contents (truncated) are inserted into the input |

Use **View → Open View… → Fetch Coder** or the Activity Bar icon to open the sidebar. **Plan/Act** is toggled in the chat UI (no default keybinding for it).

### Not on the roadmap (yet)

The extension **does not** sync threads with Cursor’s built-in chat, hook Cursor’s inline `/` commands, or replace the host’s gRPC streaming stack with a raw webview `fetch` client — those would need official APIs and/or a larger product decision. The sidebar agent remains the integration surface.

---

## 🎨 Toolbar Guide

| Button | Function |
|--------|----------|
| **@** | Add context (files, folders, git, etc.) |
| **+** | Attach files or images |
| **🌐** | Toggle web search |
| **⚙** | Open API / extension settings |
| **▤** | Templates (Fetch.ai / uAgents shortcuts) |
| **🔌** | MCP servers |
| **✨** | Enhance **prompt only** (rewrites your instruction, not the answer) |
| **📤** | Send message |

---

## 📦 Installation from Source

```bash
# Clone repository
git clone https://github.com/gautammanak1/asi1-vs-code.git
cd asi1-vs-code

# Install dependencies (root + webview-ui)
npm run install:all

# Build
npm run protos
npm run build:webview
npm run compile

# Launch (press F5)
# Opens VS Code Extension Development Host
```

---

## 📚 Documentation

Project guides (beyond this README):

| Guide | Description |
|-------|-------------|
| [Installation](docs/INSTALLATION.md) | Marketplace, VSIX install, clone/build from source |
| [Configuration reference](docs/CONFIGURATION.md) | `asiAssistant.*` and `fetchCoder.*` keys from package.json |
| [API overview](docs/API.md) | ASI:One pointers and upstream docs ([docs.asi1.ai](https://docs.asi1.ai)) |
| [Architecture](docs/ARCHITECTURE.md) | High-level host ↔ webview map and deeper reading |
| [Security & privacy](docs/SECURITY.md) | Keys, telemetry, vulnerability reporting |
| [Contributing](CONTRIBUTING.md) | PR workflow, setup, testing — read before submitting code |

---

## 🔗 Resources

| Resource | Link |
|----------|------|
| **Website** | [asi1.ai](https://asi1.ai) |
| **Developer portal (keys)** | [asi1.ai/developer](https://asi1.ai/developer?utm_source=vscode&utm_medium=aff&utm_campaign=india2026) |
| **API Docs** | [docs.asi1.ai](https://docs.asi1.ai) |
| **GitHub** | [gautammanak1/asi1-vs-code](https://github.com/gautammanak1/asi1-vs-code) |
| **Agentverse** | [agentverse.ai](https://agentverse.ai) |
| **Fetch.ai Docs** | [innovationlab.fetch.ai](https://innovationlab.fetch.ai) |
| **Support** | [Discord Community](https://discord.gg/fetchai) |

---

## Store listings and releases

**VS Code Marketplace:** The published extension’s **long description** is this root **README**. The storefront **name**, **short summary**, and **version** come from [`package.json`](package.json) (`displayName`, `description`, `version`).

**Open VSX:** If you publish the same `.vsix` to Open VSX, the same README and `package.json` fields apply once the registry has ingested your upload.

**Cursor:** Cursor installs standard VS Code extensions (**View → Extensions**). Listing text reflects the package you publish. This extension’s chat runs in the **sidebar webview**; it does **not** integrate with Cursor’s built-in chat—see **[Not on the roadmap (yet)](#not-on-the-roadmap-yet)**.

### Release checklist (maintainers)

- Bump **`version`** in `package.json` and refresh README **release** badges and the “Current extension version” subtitle if they pin a specific SemVer string.
- Keep **`description`** in `package.json` aligned with the one-line summary shown in marketplace search results (this README is the long description below it).
- Add an entry in [CHANGELOG.md](CHANGELOG.md) for the release.
- Run your usual `npm` build and publish flow (VS Code Marketplace publisher and Open VSX, if applicable). After publishing, verify the storefronts show the updated short summary and README.

---

## 📄 License

Apache License 2.0 — see [LICENSE](LICENSE) for details.

---

<div align="center">

**Built with ❤️ by [Gautam Manak](https://github.com/gautammanak1)**

**Powered by [asi1.ai](https://asi1.ai) — The future of autonomous coding**

[⬆ Back to top](#fetch-coder-for-cursor)

</div>
