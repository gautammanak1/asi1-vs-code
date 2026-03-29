<p align="center">
  <strong>ASI1 Code</strong><br/>
  <span>Sidebar AI chat for VS Code — powered by ASI1 · Vector banner: <code>resources/readme-banner.svg</code></span>
</p>

<p align="center">
  <a href="https://github.com/gautammanak1/asi1-vs-code/actions/workflows/ci.yml"><img src="https://github.com/gautammanak1/asi1-vs-code/actions/workflows/ci.yml/badge.svg" alt="CI" /></a>
  <a href="./LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License" /></a>
  <a href="https://code.visualstudio.com/"><img src="https://img.shields.io/badge/VS%20Code-1.85+-007ACC?logo=visualstudiocode&logoColor=white" alt="VS Code" /></a>
  <a href="https://marketplace.visualstudio.com/items?itemName=GautamManak.asi1-code"><img src="https://img.shields.io/badge/VS%20Marketplace-Install-007ACC?logo=visualstudiocode&logoColor=white" alt="Install on VS Marketplace" /></a>
</p>

# ASI1 Code

**ASI1 Code** is a **Visual Studio Code** extension (works in **Cursor** too) that adds a **sidebar AI chat** wired to the **ASI1** API ([api.asi1.ai](https://api.asi1.ai)). It streams replies, renders **Markdown** and syntax-highlighted code, and can turn hints in answers into files in your open workspace. Banner chips link to **Website**, **Docs**, **X**, **Community**, **Resources**, **Support**, and **Contact** — tailored for **ASI1** and the **Fetch.ai** ecosystem.

**Extension id:** `GautamManak.asi1-code`  
**Engine:** VS Code `^1.85.0`.

---

## What ASI1 Code does

ASI1 Code is built for developers who want a **fast, focused coding assistant** inside the editor: one panel for chat, your repo context, and optional **auto-apply** of generated paths.

**ASI1 Code can:**

- Stream **natural-language** answers with **GitHub-flavored Markdown** and real fenced code blocks  
- Highlight code with **Highlight.js** in the chat webview  
- Parse **file hints** (`Save as`, paths) and optionally **write files** into the open folder  
- Surface **links** from the banner (website, docs, community, support, contact — all configurable in settings)

---

## Key features

| Area | Details |
|------|---------|
| **Editor-native chat** | Activity bar view **ASI1 Code → Chat**; dark UI with logo and configurable subtitle |
| **Streaming** | Server-sent events (SSE) by default; turn off if your network returns JSON only |
| **Markdown & code** | Tables, lists, headings; language-tagged fences for copy/paste |
| **Workspace-aware** | With a folder open, optional **auto-apply** after each reply (or use explicit create actions) |
| **API key** | **ASI: Set API Key**, setting `asiAssistant.apiKey`, or env `ASI_ONE_API_KEY` |
| **Configurable** | Base URL, model, system prompt, stream toggle, banner text and every link |

---

## Get started

1. **Install** from the [Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=GautamManak.asi1-code), or install a local `.vsix` (see below).  
2. **Set your API key** — Command Palette → **ASI: Set API Key**, or settings / environment as in [Configuration](#configuration).  
3. Open **ASI1 Code** in the activity bar → **Chat**, or press **`Ctrl+Shift+;`** (**`Cmd+Shift+;`** on macOS) for **ASI: Open Assistant Chat**.  
4. Open a **folder** if you want generated files written into the project.

---

## Commands

Command IDs match `package.json` (`contributes.commands`).

| Command ID | Title | Keyboard shortcut |
|------------|--------|-------------------|
| `asiAssistant.openChat` | ASI: Open Assistant Chat | `Ctrl+Shift+;` / `Cmd+Shift+;` |
| `asiAssistant.askAboutSelection` | ASI: Ask About Selection | — |
| `asiAssistant.insertApiKey` | ASI: Set API Key | — |
| `asiAssistant.installFromVsix` | ASI: Install Extension from .vsix | — |

---

## Configuration

All settings are under **ASI1 Code**, prefix **`asiAssistant.*`**. Highlights:

| Setting | Purpose |
|---------|---------|
| `asiAssistant.apiKey` | ASI1 API key |
| `asiAssistant.baseUrl` / `asiAssistant.model` | Endpoint and model id |
| `asiAssistant.streamResponse` | Enable SSE streaming |
| `asiAssistant.autoApplyFiles` | Auto-write detected files after replies |
| `asiAssistant.bannerTitle` / `bannerSubtitle` | Banner text |
| `asiAssistant.linkWebsite` … `linkContact` | Banner link URLs (website, docs, X, community, resources, support, contact) |

---

## Changelog

Release history lives in [CHANGELOG.md](./CHANGELOG.md). After the repo is public, you can also point users to release notes on GitHub:

`https://github.com/gautammanak1/asi1-vs-code/releases`

---

## Install from `.vsix` (testing or offline)

```bash
npm install
npm run compile
npm run package
```

Then in VS Code: **Extensions: Install from VSIX…** and pick `asi1-code-<version>.vsix`, or:

```bash
code --install-extension ./asi1-code-0.1.0.vsix
```

---

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md).

---

## Security

See [SECURITY.md](./SECURITY.md).

---

## License

[MIT](./LICENSE) — Copyright (c) 2026 Gautam Manak and contributors.
