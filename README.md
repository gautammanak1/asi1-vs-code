<div align="center">

<img src="assets/fetch-coder-banner.png" alt="Fetch Coder Banner" width="100%" />

<br/><br/>

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
    <img src="https://img.shields.io/badge/ASI:One-API-6366f1?style=flat" alt="ASI:One API" />
  </a>
  <a href="https://www.fetch.ai/">
    <img src="https://img.shields.io/badge/Fetch.ai-Ecosystem-0891b2?style=flat" alt="Fetch.ai" />
  </a>
</p>

<p align="center">
  An autonomous AI coding agent that lives inside your editor.<br/>
  Chat, generate code, build uAgents, edit files, run terminal commands — all powered by <strong>ASI:One</strong>.
</p>

</div>

---

## What is Fetch Coder?

Fetch Coder is an AI-powered coding **agent** for **VS Code** and **Cursor**, powered exclusively by the **ASI:One** LLM — the world's first Web3-native language model designed for agentic AI.

It gives you a full agent loop right inside the editor — plus built-in knowledge of the **Fetch.ai ecosystem** to help you build uAgents, connect to Agentverse, and integrate with MCP servers.

**Extension ID:** `gautammanak2.fetch-coder`

---

## Features

| Area | What you get |
|------|--------------|
| **ASI:One Powered** | Hardcoded to use `asi1` model via `https://api.asi1.ai/v1` — no setup needed beyond API key |
| **Fetch.ai Knowledge** | Built-in knowledge of uAgents, Agentverse, Chat Protocol, Payment Protocol, MCP integration |
| **Chat** | Sidebar panel with streaming, Markdown, syntax-highlighted code blocks |
| **Agent Tools** | Read/write files, search, list files, run terminal commands |
| **MCP** | Connect to Model Context Protocol servers for extended capabilities |
| **Plan & Act** | Separate planning and execution modes for thoughtful multi-step work |
| **Checkpoints** | Snapshot before changes, revert when needed |
| **Subagents** | Parallel task execution for complex work |
| **Browser** | Automated browser testing and web interaction |
| **Focus Chain** | Track task progress with structured to-do lists |
| **History** | Full task history with search and filtering |

---

## Quick Start

### 1. Install

**From VS Code Marketplace:**

```
https://marketplace.visualstudio.com/items?itemName=gautammanak2.fetch-coder
```

Or search for **"Fetch Coder"** in the Extensions panel (VS Code or Cursor).

### 2. Get your ASI:One API Key

1. Visit [asi1.ai/chat](https://asi1.ai/chat) and log in
2. Go to [asi1.ai/dashboard/api-keys](https://asi1.ai/dashboard/api-keys)
3. Click **"Create API Key"** and copy it

### 3. Set your API Key

Open Fetch Coder in the sidebar and paste your API key in the settings. Or set it via environment variable:

```bash
export ASI_ONE_API_KEY=your_api_key
```

The base URL (`https://api.asi1.ai/v1`) and model (`asi1`) are hardcoded — no configuration needed.

### 4. Start coding!

Open the Fetch Coder sidebar panel and start chatting. Try:

- *"Create a Fetch.ai uAgent with message handling"*
- *"Build a REST API with Express.js"*
- *"Explain this codebase and suggest improvements"*

---

## What Can You Build?

Fetch Coder has built-in knowledge of the entire Fetch.ai ecosystem:

### uAgents
Create autonomous microservice agents using the `uagents` Python framework:
```
"Create a uAgent that responds to messages and registers on Agentverse"
```

### Agent Chat Protocol
Build agents that communicate using the standardized Chat Protocol:
```
"Set up two agents communicating via ChatMessage and ChatAcknowledgement"
```

### Agent Payment Protocol
Implement payment flows between buyer and seller agents:
```
"Create a buyer and seller agent using the Payment Protocol with USDC"
```

### MCP Integration
Connect agents to external tools via Model Context Protocol:
```
"Build a uAgent that connects to remote MCP servers for web search"
```

### ASI:One API Apps
Build applications powered by the ASI:One LLM:
```
"Create a Python chatbot using the ASI:One streaming API"
```

### Any Code Project
Fetch Coder is a general-purpose coding agent — build anything:
```
"Build a Next.js dashboard with authentication and dark mode"
```

---

## Documentation

| Resource | URL |
|----------|-----|
| **Fetch.ai Innovation Lab** | [innovationlab.fetch.ai/resources/docs/intro](https://innovationlab.fetch.ai/resources/docs/intro) |
| **uAgent Creation** | [innovationlab.fetch.ai/resources/docs/agent-creation/uagent-creation](https://innovationlab.fetch.ai/resources/docs/agent-creation/uagent-creation) |
| **Agent Communication** | [innovationlab.fetch.ai/resources/docs/agent-communication/uagent-uagent-communication](https://innovationlab.fetch.ai/resources/docs/agent-communication/uagent-uagent-communication) |
| **Agent Chat Protocol** | [innovationlab.fetch.ai/resources/docs/agent-communication/agent-chat-protocol](https://innovationlab.fetch.ai/resources/docs/agent-communication/agent-chat-protocol) |
| **Payment Protocol** | [innovationlab.fetch.ai/resources/docs/agent-transaction/agent-payment-protocol](https://innovationlab.fetch.ai/resources/docs/agent-transaction/agent-payment-protocol) |
| **ASI:One Introduction** | [innovationlab.fetch.ai/resources/docs/asione/asi1-introduction](https://innovationlab.fetch.ai/resources/docs/asione/asi1-introduction) |
| **ASI:One Getting Started** | [innovationlab.fetch.ai/resources/docs/asione/asi1-getting-started](https://innovationlab.fetch.ai/resources/docs/asione/asi1-getting-started) |
| **MCP Integration** | [innovationlab.fetch.ai/resources/docs/mcp-integration/what-is-mcp](https://innovationlab.fetch.ai/resources/docs/mcp-integration/what-is-mcp) |
| **Agentverse** | [innovationlab.fetch.ai/resources/docs/agentverse](https://innovationlab.fetch.ai/resources/docs/agentverse/) |
| **FetchCoder CLI** | [innovationlab.fetch.ai/resources/docs/fetchcoder/overview](https://innovationlab.fetch.ai/resources/docs/fetchcoder/overview) |
| **ASI:One API** | [api.asi1.ai](https://api.asi1.ai/) |
| **Agentverse Platform** | [agentverse.ai](https://agentverse.ai/) |
| **VS Marketplace** | [Fetch Coder](https://marketplace.visualstudio.com/items?itemName=gautammanak2.fetch-coder) |

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

Press **F5** in VS Code to launch the Extension Development Host.

### Package as VSIX

```bash
npx @vscode/vsce package --no-dependencies
```

---

## Repository Layout

| Path | Purpose |
|------|---------|
| `src/core/` | Task loop, API handler (ASI:One), tools, prompts, storage |
| `src/core/prompts/` | System prompt with Fetch.ai knowledge base |
| `src/shared/` | Shared types, API types, proto definitions |
| `src/integrations/` | Terminal, editor/diff, diagnostics, notifications |
| `src/services/` | MCP hub, search, browser session, tree-sitter parsing |
| `src/hosts/` | VS Code host, terminal manager, webview helpers |
| `webview-ui/` | React + Vite + Tailwind chat UI |
| `proto/` | Protocol Buffer definitions for gRPC communication |
| `.github/workflows/` | CI, publish to VS Marketplace, publish to Open VSX |

---

## Publishing

### GitHub Secrets (CI/CD)

Add these in **Settings → Secrets and variables → Actions**:

| Secret | Purpose | Where to get it |
|--------|---------|-----------------|
| `VSCE_PAT` | Publish to VS Code Marketplace | [Azure DevOps](https://dev.azure.com/) → Personal Access Tokens → scope: **Marketplace → Manage** |
| `OVSX_PAT` | Publish to Open VSX (for Cursor) | [Open VSX](https://open-vsx.org/) → User Settings → Access Tokens |

### Release a New Version

1. Bump `"version"` in `package.json`
2. Commit and push to `main`
3. Create a git tag: `git tag v0.2.3 && git push origin v0.2.3`
4. The publish workflows will automatically build and publish

---

## License

Apache-2.0 — see [LICENSE](LICENSE).

---

<div align="center">

**Built with ASI:One by [Gautam Manak](https://github.com/gautammanak1)**

If you like this project, give it a star on [GitHub](https://github.com/gautammanak1/asi1-vs-code).

</div>
