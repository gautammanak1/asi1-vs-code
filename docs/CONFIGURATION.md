# Configuration reference

VS Code merges settings from **User**, **Workspace**, and the extension’s **`contributes.configuration`** in [`package.json`](../package.json). This page lists **`asiAssistant.*`** and **`fetchCoder.*`** keys exactly as shipped; UI labels may differ slightly in the sidebar.

For **model selection**, branding, telemetry, and behavior not covered below, see the main **[README](../README.md)** (Configuration, shortcuts, Privacy).

---

## ASI:One sync (`asiAssistant.*`)

| Key | Default | Description |
|-----|---------|-------------|
| `asiAssistant.apiKey` | `""` | ASI:One API key (optional if `ASI_ONE_API_KEY` is set). Applied to the Fetch Coder OpenAI-compatible provider on startup. |
| `asiAssistant.baseUrl` | `https://api.asi1.ai/v1` | OpenAI-compatible API base URL (no `/chat/completions` suffix). |
| `asiAssistant.model` | `asi1` | Model id for Plan and Act modes when using ASI:One settings sync. The UI exposes choices such as `asi1-ultra`, `asi1`, `asi1-mini` (aligned with hosted product names). |

---

## Fetch Coder (`fetchCoder.*`)

| Key | Type / constraint | Default | Description |
|-----|-------------------|---------|-------------|
| `fetchCoder.quickActionPrompts` | object | (see schemas in [`package.json`](../package.json)) | Optional overrides for quick-action prompts (Explain, Fix, Improve, Refactor). Placeholders include `{{fileMention}}`, `{{language}}`, `{{selectedText}}`, `{{problemsString}}`. |
| `fetchCoder.quickActionsIncludeFileContext` | boolean | `false` | Append truncated current file content to quick-action prompts when the editor matches the active file. |
| `fetchCoder.contextMaxFileChars` | number (minimum `1000`) | `20000` | Maximum characters of file text to include when file context is enabled. |
| `fetchCoder.hostApp` | `auto` \| `vscode` \| `cursor` | `auto` | Which editor host to assume for help text; `auto` uses the running app. Override only if detection is wrong. |
| `fetchCoder.brandTheme` | `host` \| `cursor-accent` | `cursor-accent` | Sidebar UI accents: `host` (classic ASI blue/lime) vs `cursor-accent` (Cursor-style blue/cyan). Editor chrome still follows your theme. |
| `fetchCoder.extraSystemPrompt` | string (max ~8000) | `""` | Optional text appended to the model system prompt on every request (in addition to built-in rules). |
| `fetchCoder.auth0.enabled` | boolean | `false` | Use Auth0 for account sign-in (profile/email). LLM calls still use your API keys / ASI:One settings. |
| `fetchCoder.auth0.domain` | string | `""` | Auth0 tenant domain (see description in [`package.json`](../package.json) for Native app URI notes). |
| `fetchCoder.auth0.clientId` | string | `""` | Auth0 Native application Client ID. |
| `fetchCoder.auth0.audience` | string | `""` | Optional Auth0 API audience. |

Additional behavior (mentions, MCP, checkpoints, approvals) is controlled **inside** the extension UI and persisted state—not always exposed as standalone `configuration` keys here.
