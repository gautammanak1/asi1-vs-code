# Changelog

All notable changes to **Fetch Coder** are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.2.14] - 2026-04-12

### Added

- Assistant message toolbar: **Retry** (resend prior user prompt), **Copy**, and **thumbs down** feedback under assistant replies (`AssistantMessageToolbar`, `findRetryPrompt`).
- `formatContextWindow` helpers and tests — sane labels when model context is unbounded (`Infinity` tiers).

### Fixed

- **`Asi.addToChat` not found:** register `AddToChat`, `FixWithAsi`, `ExplainCode`, and `ImproveCode` early in `extension.ts` activation (before heavier setup).
- Token/context UI: avoid `Infinity` in token bar and onboarding context labels; sanitize `contextWindow` in API config normalization.
- VS Code: `MarkdownBlock` loads `codeblock-parser.css` for highlighted code in chat.

### Changed

- **Chat UI:** Result panel uses a dark background; completion output uses IDE-style syntax colors (scoped `.completion-output-content`).
- **Typewriter** activity text default speed reduced (faster perceived typing).
- **CI:** removed redundant `ci.yml`; Tests workflow runs test matrix in parallel with quality checks; E2E on PRs uses Ubuntu only (full OS matrix on `main` / manual).
- **Versions:** extension **0.2.14**, webview-ui package **0.3.2**.

---

## [0.2.13] - 2026-04-12

### Added

- `webview-ui/src/types/web-speech.d.ts` — Web Speech API typings (`SpeechRecognition`, events) so CI/webview `tsc` passes without full DOM lib gaps.
- Voice tab typing: `SettingsTabID` includes `"voice"`.

### Fixed

- `VoiceInputService` feature detection (`MediaRecorder` / `navigator.mediaDevices`) — avoids always-true checks under strict TypeScript.
- Vitest: `ErrorRow` test matches **PowerShell troubleshooting guide** copy; `ToolGroupRenderer` test matches **Fetch Coder read 1 file** summary.
- `SpeechRecognition.onend` added to typings (used when stopping browser speech in `VoiceInputButton`).

### Changed

- Version, README badge, and marketplace metadata bumped to **0.2.13**.

---

## [0.2.12] - 2026-04-12

### Fixed

- **Asi-diff / write_to_file diff editor:** virtual document URIs use a proper leading `/` path so the diff editor opens reliably (not `scheme:filename`-style paths).

### Changed

- Default ASI:One model **asi1-mini**; API retry and error handling improvements.
- `package.json` `activationEvents` / command contributions for palette shortcuts (e.g. Open AI Chat).
- **Voice:** webview transcription/TTS services, voice settings section, chat wiring; editor-like chat background styling.
- README and lockfile version alignment.

---

## [0.2.11] - 2026-04-12

### Added

- **Checkpoints:** `CheckpointService` with JSON snapshots under `.fetch-coder/checkpoints`; hooks for write / `apply_patch` tools; virtual document provider for `vscode.diff`.
- VS Code: status bar, commands (browse checkpoints, save, revert last, clear), keybinding for quick revert last.
- Webview: checkpoint panel, quick revert bar in chat, revert confirmation dialog; list API enriches files with line diff stats vs disk.

### Changed

- Version bump to **0.2.11**; includes related POC/UX work (memory, slash commands, MCP, templates, activity bar experiments).

---

## [0.2.10] - 2026-04-12

### Added

- Sidebar **WebviewView** chat host (activity bar) with `retainContextWhenHidden`; **Open AI Chat** command (`Asi.openAiChat`) to focus the sidebar webview.

### Changed

- Welcome / onboarding / account headers rebranded toward **fetch code** styling (`#85F47C`); logo mark removed from those surfaces.
- Views contributed via `viewsContainers` / `views` as required for the sidebar webview.

---

## [0.2.9] - 2026-04-12

### Changed

- Welcome experience simplified: no hero icons, heavy gradients, or entrance animations — flatter layout, text-first branding.
- **HomeHeader:** text-only branding, theme tokens; Settings opens settings.
- **WelcomeView:** flat layout; API key + Get Started flow preserved.

---

## [0.2.8] - 2026-04-12

### Removed

- “Lazy teammate” mode removed from prompts.

### Changed

- Welcome / webview UI polish; **FetchCoderMark** fallback behavior.
- Web search: DuckDuckGo fallback path; sidebar/panel webview fixes.
- **WelcomeView** aligned with **HomeHeader** gradient and animations (before later simplification in 0.2.9).

---

## [0.2.7] - 2026-04-12

### Added

- Fetch.ai knowledge bundle integration; unit test harness (Mocha patch, `requires.js`); standalone runtime files for ASI CLI.

### Changed

- Web search improvements; MCP and webview fixes.

---

## [0.2.6] - 2026-04-11

### Changed

- Webview assets consolidated around **FetchCoderMark** + `icons/icon.png`; Kanban demo moved under `public/`.
- MCP: skip OAuth when servers already send `Authorization` headers.
- General webview cleanup; extension and `webview-ui` package versions bumped.

---

## [0.2.1] - 2026-04-10

### Changed

- Replaced all logos and icons with ASI branding (graduation cap, cyan/purple gradient)
- Removed all external social links (Discord, X, Reddit, LinkedIn) from UI
- Removed external documentation links from settings About section
- Removed emojis from What's New dialog
- Updated version to **0.2.1** across package.json, manifest, and all metadata
- Prepared project for VS Code Marketplace and Open VSX publishing

---

[0.2.14]: https://github.com/gautammanak1/asi1-vs-code/releases/tag/v0.2.14
[0.2.13]: https://github.com/gautammanak1/asi1-vs-code/releases/tag/v0.2.13
[0.2.12]: https://github.com/gautammanak1/asi1-vs-code/releases/tag/v0.2.12
[0.2.11]: https://github.com/gautammanak1/asi1-vs-code/releases/tag/v0.2.11
[0.2.10]: https://github.com/gautammanak1/asi1-vs-code/releases/tag/v0.2.10
[0.2.9]: https://github.com/gautammanak1/asi1-vs-code/releases/tag/v0.2.9
[0.2.8]: https://github.com/gautammanak1/asi1-vs-code/releases/tag/v0.2.8
[0.2.7]: https://github.com/gautammanak1/asi1-vs-code/releases/tag/v0.2.7
[0.2.6]: https://github.com/gautammanak1/asi1-vs-code/releases/tag/v0.2.6
[0.2.1]: https://github.com/gautammanak1/asi1-vs-code/releases/tag/v0.2.1
