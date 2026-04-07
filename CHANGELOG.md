# Changelog

All notable changes to **ASI1 Code** are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

---

## [0.1.9] - 2026-04-07

### Added

- **Advanced agent system prompt**: Diff preview mode (read before edit), terminal safety mode (explain before run), multi-step agent execution with validation, debug mode, project setup mode.
- **ASI:One function calling alignment**: All 11 tool schemas now include `strict: true` and `additionalProperties: false` per [ASI:One docs](https://innovationlab.fetch.ai/resources/docs/asione/build/function-calling).
- **Robust API error handling**: All API paths use `fetchWithRetry` with 3× retry and exponential backoff (1s, 3s, 8s) for HTTP 429/500/502/503/504. Clean user-friendly error messages instead of raw HTML dumps.

### Changed

- Tool calling loop accepts `finish_reason` of `tool_calls`, `tool_use`, or `stop` with tool calls present for broader ASI:One compatibility.
- Handles `arguments` at both `tc.function.arguments` and `tc.arguments` levels.
- Retries module now covers 502/503/504 in addition to 429/500, with proper response body drain before retry.
- Version bump to **0.1.9**.

---

## [0.1.8] - 2026-04-04

### Added

- **Composer Mode**: Multi-file AI code generation with plan → preview → apply flow.
- **Code block toolbar**: Copy, Insert at Cursor, Replace Selection, Apply, Open Diff, Save buttons on every code block.
- **Chat message actions**: Continue generation, Fork chat, Pin message, Export message, Apply All Changes.
- **AI Git commands**: AI-generated commit messages from staged diff; AI-generated PR descriptions.
- **20+ slash commands**: /fix, /tests, /review, /refactor, /explain, /optimize, /doc, /terminal, /workspace, /commit, /pr, /scaffold, /composer, /export, /fetchai, /instructions, /audit.
- **Project scaffolding**: 7 templates — React, Next.js, Express, FastAPI, Chrome Extension, VS Code Extension, SaaS Starter.
- **Custom instructions**: Persistent rules editor, auto-injected into every API call.
- **Stack auto-detection** (`contextIndexer.ts`): Detects framework, package manager, test framework, linter, formatter, database, ORM, CSS framework, UI library, deployment platform.
- **Symbol extraction**: Indexes classes, functions, interfaces, types, components, routes from workspace files.
- **Fetch.ai integration**: uAgent creation, Agent Communication, Agentverse Deploy, Agent Transaction, MCP Integration, Multi-Agent System, Docs Lookup.
- **Advanced markdown**: Collapsible `<details>` sections, GitHub-style callouts (`[!NOTE]`, `[!WARNING]`), blockquotes.
- **Drag-and-drop**: Drop files and images into chat for context; images read as data URLs.
- **Diff & revert system**: Side-by-side diff preview, revert history, file snapshots before changes.
- **Search-and-replace patching**: `workspace_patch_file` tool for targeted edits without full overwrite.
- **Content search**: `workspace_search_text` tool for full-text/regex search across workspace.
- **Audit logging** (`security/auditLogger.ts`): Track all tool executions with show/clear commands.
- **Background workspace indexing**: Auto-indexes project context 3s after activation.
- **Chat export**: Export chat history to Markdown or JSON.

### Changed

- **Advanced agent system prompt**: Rewrote system prompt with diff preview mode, terminal safety mode, multi-step agent execution, debug mode, and project setup behavior. The agent now identifies as an autonomous coding agent that must use tools for all actions.
- **ASI:One function calling alignment**: All tool schemas now include `strict: true` and `additionalProperties: false` per [ASI:One Function Calling docs](https://innovationlab.fetch.ai/resources/docs/asione/build/function-calling).
- **Robust API error handling**: All API calls (tool loop, streaming, non-streaming) now use `fetchWithRetry` with 3× retry and exponential backoff (1s, 3s, 8s) for 429/500/502/503/504 errors. Error messages are user-friendly (no raw HTML dumps).
- **Tool calling loop hardened**: Accepts `finish_reason` of `tool_calls`, `tool_use`, or `stop` with tool calls present. Handles `arguments` at both `tc.function.arguments` and `tc.arguments` for ASI:One compatibility.
- **Modular architecture**: Split `asiClient.ts` into `api/` (config, retries, models, streaming), `tools/` (definitions, executor), `security/` (commandAllowlist, auditLogger).
- Terminal security integrated via dedicated `security/commandAllowlist.ts` module.
- Custom instructions and project context auto-injected into system prompt.

---

## [0.1.7] - 2026-04-04

### Fixed

- Open VSX publish workflow: split `create-namespace` into its own step with proper error reporting instead of silently suppressing failures with `|| true`.

### Changed

- Version bump to **0.1.7** with updated README and Marketplace metadata.

---

## [0.1.5] - 2026-04-02

### Changed

- Rebranded extension naming/docs to **Fetch Coder** and bumped package metadata/version for the new release.
- Chat UX polish: revert action, composer-first edit flow, and file creation behavior now preserves chat sidebar focus.

---

## [0.1.4] - 2026-03-31

### Changed

- Removed Agentverse/uAgent scaffold command and related template assets from the extension.
- Updated docs (`README.md`, `README.vsix.md`) to reflect the current command set and feature scope.

---

## [0.1.3] - 2026-03-31

### Added

- **Single composer** for chat and image: toolbar **Chat** / **Image** + optional **size**; no separate modal.
- Markdown: inline images from `![alt](https://…)` or `data:image/…` (`md-inline-img`).

### Changed

- Image generation results appear **in the chat log** as assistant messages (markdown image).

### Removed

- **ASI run** modal (replaced by Chat/Image mode on the main input).

---

## [0.1.2] - 2026-03-31

### Added

- **README.vsix.md** / **README.md** (Marketplace long description): extension **icon** at the top, **v0.1.2** callout, release badge, image API settings documented, `.vsix` install filename updated.

### Changed

- Chat webview: **black / zinc** theme, **large top banner** removed from the sidebar; compact **ASI1 Code** label in the chat top bar.

---

## [0.0.2] - 2026-03-30

### Added

- **ASI: Create Agentverse uAgent Project**: Python scaffold aligned with `create-agentverse-agent` (`main.py`, `agent.py`, Makefile, Docker, `.env`, templates under `resources/agentverse-templates/`).
- **Run…** modal: choose **Chat completions** or **Image generate** (same prompt UI); image calls `POST /v1/image/generate` with optional `asiAssistant.imageBaseUrl`, `imageModel`, `imageSize`.
- Split webview assets: `media/chat.css`, `media/chatPanel.js` (plus existing `chatMarkdown.js`).
- ASI client: `web_search`, workspace tools + tool loop, optional `x-session-id`, `maxToolRounds`; `deriveApiV1Base` / `generateImage`.

### Changed

- Chat: smoother streaming (state before stream teardown; rAF-coalesced preview), session id in header, default system prompt (Agentverse Python-only guidance; no JS/TS uAgent scaffold).
- Workspace file extraction: `PLAINTEXT` / `Save as` pairing, **Open Folder** when no workspace.
- README / CONTRIBUTING / `README.vsix.md` refresh.

### Fixed

- Duplicate `PYTHON` keys in pseudo-fence maps (`workspaceFiles`, `chatMarkdown`).

---

## [0.1.1] - 2026-03-31

### Fixed

- CI publish: clearer failure when `VSCE_PAT` is missing; `vsce publish` with `--no-dependencies` for faster, more reliable runs.

### Changed

- Version **0.1.1** so Marketplace accepts the update after **0.1.0**.

---

## [0.1.0] - 2026-03-30

### Added

- Initial release: sidebar chat webview, ASI1 API integration, streaming replies, Markdown and syntax-highlighted code blocks, workspace file hints and optional auto-apply, banner links, commands for chat, selection, API key, and install from `.vsix`.

---

[Unreleased]: https://github.com/gautammanak1/asi1-vs-code/compare/v0.1.7...HEAD  
[0.1.7]: https://github.com/gautammanak1/asi1-vs-code/releases/tag/v0.1.7  
[0.1.5]: https://github.com/gautammanak1/asi1-vs-code/releases/tag/v0.1.5  
[0.1.4]: https://github.com/gautammanak1/asi1-vs-code/releases/tag/v0.1.4  
[0.1.3]: https://github.com/gautammanak1/asi1-vs-code/releases/tag/v0.1.3  
[0.1.2]: https://github.com/gautammanak1/asi1-vs-code/releases/tag/v0.1.2  
[0.0.2]: https://github.com/gautammanak1/asi1-vs-code/releases/tag/v0.0.2  
[0.1.1]: https://github.com/gautammanak1/asi1-vs-code/releases/tag/v0.1.1  
[0.1.0]: https://github.com/gautammanak1/asi1-vs-code/releases/tag/v0.1.0  
