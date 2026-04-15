# AI coding assistant architecture (Fetch Coder)

This document maps product goals to the codebase and the thin **`src/extension/ai`** layer added for separation of concerns.

## Stack overview

| Concern | Location | Notes |
|--------|----------|--------|
| Chat UI (React, Tailwind) | `webview-ui/` | Primary assistant surface; markdown, actions, streaming UI live here. |
| Extension host ↔ webview | `src/core/webview/`, `src/hosts/vscode/VscodeWebviewProvider.ts` | gRPC-style messaging, state sync. |
| Streaming / tasks | `src/core/controller/` | Task lifecycle, model calls, streaming to the webview. |
| Quick actions (Explain / Fix / Improve / Refactor) | `src/core/controller/commands/*WithCline.ts` + **`src/extension/ai`**** | Commands build a **prompt string** and call `controller.initTask` (or append to an active notebook task). |

## New module: `src/extension/ai`

```
src/extension/ai/
  api/assistantTaskClient.ts      # initTask / notebook append (streaming stays in Controller)
  context/EditorContextBuilder.ts # cursor + optional truncated file text
  prompts/
    PromptManager.ts
    quickActionTemplates.ts       # defaults + interpolation
    buildTemplateVars.ts          # CommandContext → template vars
  index.ts
```

- **`prompts/PromptManager`**: Resolves quick-action prompt text from **defaults** plus optional **`fetchCoder.quickActionPrompts`** overrides. Placeholders: `{{fileMention}}`, `{{language}}`, `{{selectedText}}`, `{{problemsString}}`.
- **`context/EditorContextBuilder`**: Wraps `getContextForCommand` and optionally captures **cursor position** and **truncated full-file text** for richer prompts when enabled.
- **`api/assistantTaskClient`**: Single entry for “send this prompt to the assistant task” (`initTask` / notebook append). Streaming remains in the controller; this module documents the bridge.

## Configuration

- **API**: `asiAssistant.apiKey`, `asiAssistant.baseUrl`, `asiAssistant.model` (see Settings).
- **Quick-action templates**: `fetchCoder.quickActionPrompts.*` (optional string overrides per action).
- **File context in quick actions**: `fetchCoder.quickActionsIncludeFileContext` (boolean), `fetchCoder.contextMaxFileChars` (number).

## Commands

| User-facing title | Command id | Handler |
|-------------------|------------|---------|
| Explain with Fetch Coder | `Asi.explainCode` | `explainWithAsi` |
| Fix with Fetch Coder | `Asi.fixWithAsi` | `fixWithAsi` |
| Improve with Fetch Coder | `Asi.improveCode` | `improveWithAsi` |
| Refactor with Fetch Coder | `Asi.refactorCode` | `refactorWithAsi` |

Register new commands in `package.json` under `contributes.commands` so the Command Palette and keybindings resolve them.

## Performance

Quick actions should stay **async** and avoid blocking the UI thread beyond unavoidable `await` on editor/webview setup. Heavy work stays in the task/controller layer.
