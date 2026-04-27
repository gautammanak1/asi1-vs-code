# Changelog

All notable changes to **Fetch Coder** are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

---

## [0.2.21] - 2026-04-28

### Added (Cursor & VS Code)

- **Product listing:** `displayName` **Fetch Coder for Cursor**; gallery banner color `#0D0D0D`; `cursor` keyword; walkthrough copy updated.
- **Webview theming:** Optional **Cursor-style accents** via `fetchCoder.brandTheme` (`host` | `cursor-accent`, default `cursor-accent`) and `data-fetch-brand` on the document root; `cursor-accent.css` + theme token hooks.
- **Settings:** `fetchCoder.hostApp` (`auto` | `vscode` | `cursor`) and extension state `hostAppKind` for help text; `data-host-app` on the document root; `src/hosts/detectHostAppKind.ts` + unit tests.
- **Settings:** `fetchCoder.extraSystemPrompt` — optional text merged into the model system prompt (capped in code).
- **Command:** `Asi.attachFileToChat` — open a file and insert path + truncated contents into the chat input.
- **Keybindings:** `Cmd+Shift+A` / `Ctrl+Shift+A` as an alternate **focus chat** chord (alongside `Cmd+'` / `Ctrl+'`).

### Documentation

- README: **`asiAssistant.*`** settings keys vs `fetchCoder.*`, ASI:One **model picker** (`asi1-ultra` / `asi1` / `asi1-mini`), **install from source** via `npm run install:all`, accurate **keyboard shortcuts** (`contributes.keybindings`, including AI review **Enter** and **Revert last change**), **optional telemetry** (General toggle + editor level) and **Output → `Asi`**, Cursor/VS Code install note and **out-of-scope** items (native chat sync, `/` hooks, webview SSE), branding / `extraSystemPrompt`, **table of contents**, and **Store listings and releases** (VS Code Marketplace, Open VSX, Cursor, maintainer release checklist). Added **`docs/`** guides: **[INSTALLATION](docs/INSTALLATION.md)**, **[CONFIGURATION](docs/CONFIGURATION.md)**, **[API](docs/API.md)**, **[ARCHITECTURE](docs/ARCHITECTURE.md)**, **[SECURITY](docs/SECURITY.md)** with README navigation table.

### API / Errors

- **ASI:One:** Clearer 429 / rate-limit messaging when errors surface after retries; rate limits still use existing exponential backoff in the client.

---

## [0.2.20] - 2026-04-16

### Changed

- **Chat UI:** Removed custom Copilot-style cursor overlay. Removed per-message TTS controls and auto-read from assistant rows; Voice settings tab hidden (speech features off by default in product UI).
- **Chat:** Deduplicate adjacent identical assistant messages and consecutive duplicate markdown blocks to fix repeated lines. Markdown code fences collapse with **Show more / Show less**; language label on fenced blocks; default unlabeled fences use plain text highlighting instead of JavaScript.
- **Chat:** Follow-up prompt suggestion chips above the input (context-aware + defaults).
- **MCP:** Clearer workspace config card styling and JSON format preview.
- **Workspace paths:** Inline file paths confirmed in the repo show a stronger focus ring and “open in workspace editor” tooltip.

---

## [0.2.19] - 2026-04-13

### Summary

This release focuses the product on **ASI:One / OpenAI-compatible** usage: the API layer and tooling surface are trimmed to a single client path, **account Auth0 integration is present in the tree but disabled** in favor of the existing **Asi / WorkOS** account flow, and prompts plus extension wiring are aligned with the **ASI1** tool set.

### Highlights

- **API providers:** Removed the large multi-provider matrix; core chat goes through the **ASI1-oriented client** (`asi1Client` / renamed provider path). Related unit tests for removed providers were dropped.
- **Account / auth:** **OCA** account flows and proto (`oca_account`) removed. **Auth0** implementation files remain for future use; **Auth0 is not selected at runtime** (`selectAccountAuthProvider` stays on **AsiAuthProvider**). **OAuth `state`** is still forwarded on `/auth` callbacks for when PKCE is re-enabled.
- **Controller:** After login, **Auth0-specific “don’t overwrite LLM provider”** handling is commented out with Auth0 disabled; legacy behavior continues to apply **Asi** API provider switching where applicable.
- **Prompts:** System prompt **registry and tools** are consolidated around **ASI1**; many unused model **variants** (e.g. Gemini, GLM, Hermes, Trinity, XS, native GPT variants, etc.) were removed.
- **Extension / webview:** New **extension AI** scaffolding (`src/extension/ai/…`), **Copilot-style cursor** UI pieces in the webview, and a **refactor-with-Cline** command path.
- **Docs:** Added `docs/architecture/AI_CODING_ASSISTANT.md`.

### Quality

- **`npm run ci:check-all`** (TypeScript, lint, format) passed before release.

### Upgrade note

Users relying on **non–ASI1 providers** or **OCA** from older builds should expect those code paths to be gone; configure **ASI:One** (`asiAssistant.*` / API key) as documented for this fork.

---

## [0.2.15] - 2026-04-12

### Fixed

- TypeScript: align with `@types/vscode` ^1.98 (Language Model typings in `vscode-lm`, `SecretStorage.keys` on standalone `SecretStore`, `ExtensionContext.languageModelAccessInformation` mock, remove conflicting `Terminal.shellIntegration` augmentations); guard optional `CommentThread.range` in review controller.

### Removed

- Orphan `go.work.sum` (no Go workspace in this repo).

### Changed

- **Versions:** extension **0.2.15**, webview-ui package **0.3.2** (unchanged).

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

[0.2.15]: https://github.com/gautammanak1/asi1-vs-code/releases/tag/v0.2.15
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
