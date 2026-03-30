# Changelog

All notable changes to **ASI1 Code** are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

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

[Unreleased]: https://github.com/gautammanak1/asi1-vs-code/compare/v0.1.2...HEAD  
[0.1.2]: https://github.com/gautammanak1/asi1-vs-code/releases/tag/v0.1.2  
[0.0.2]: https://github.com/gautammanak1/asi1-vs-code/releases/tag/v0.0.2  
[0.1.1]: https://github.com/gautammanak1/asi1-vs-code/releases/tag/v0.1.1  
[0.1.0]: https://github.com/gautammanak1/asi1-vs-code/releases/tag/v0.1.0  
