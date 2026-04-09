# Copilot Instructions for Asi

This is a VS Code extension. Read `.Asirules/general.md` for tribal knowledge and nuanced patterns.

## Architecture
- **Core** (`src/`): `extension.ts` → `WebviewProvider` → `Controller` (single source of truth) → `Task` (agent loop).
- **Webview** (`webview-ui/`): React/Vite app. State via `ExtensionStateContext.tsx`, synced through message passing.
- **CLI** (`cli/`): React Ink terminal UI sharing core logic. Update CLI when changing webview features.
- **Communication**: Protobuf-defined gRPC-like protocol over VS Code message passing. Schemas in `proto/`.
- **MCP**: `src/services/mcp/McpHub.ts`.

## Build & Test (Critical — non-obvious commands)
- **Build**: `npm run compile` — NOT `npm run build`.
- **Watch**: `npm run watch` (extension + webview).
- **Protos**: `npm run protos` — run **immediately** after any `.proto` change. Generates into `src/shared/proto/`, `src/generated/`.
- **Tests**: `npm run test:unit`. After prompt/tool changes: `UPDATE_SNAPSHOTS=true npm run test:unit`.

## Protobuf RPC Workflow (4 steps)
1. **Define** in `proto/asi/*.proto`. Naming: `PascalCaseService`, `camelCase` RPCs, `PascalCase` Messages. Use `common.proto` shared types for simple data.
2. **Generate**: `npm run protos`.
3. **Backend handler**: `src/core/controller/<domain>/`. 
4. **Frontend call**: `UiServiceClient.myMethod(Request.create({...}))`.
- Adding enums (e.g. `AsiSay`) → also update `src/shared/proto-conversions/Asi-message.ts`.

## Adding API Providers (silent failure risk)
Three proto conversion updates are **required** or the provider silently resets to Anthropic:
1. `proto/asi/models.proto` — add to `ApiProvider` enum.
2. `convertApiProviderToProto()` in `src/shared/proto-conversions/models/api-configuration-conversion.ts`.
3. `convertProtoToApiProvider()` in the same file.

Also update: `src/shared/api.ts`, `src/shared/providers/providers.json`, `src/core/api/index.ts`, `webview-ui/.../providerUtils.ts`, `webview-ui/.../validate.ts`, `webview-ui/.../ApiOptions.tsx`, and `cli/src/components/ModelPicker.tsx`.

For Responses API providers: add to `isNextGenModelProvider()` in `src/utils/model-utils.ts` and set `apiFormat: ApiFormat.OPENAI_RESPONSES` on models.

## Adding Tools to System Prompt (5+ file chain)
1. Add enum to `AsiDefaultTool` in `src/shared/tools.ts`.
2. Create definition in `src/core/prompts/system-prompt/tools/` (export `[GENERIC]` minimum).
3. Register in `src/core/prompts/system-prompt/tools/init.ts`.
4. Whitelist in `src/core/prompts/system-prompt/variants/*/config.ts` for each model family.
5. Handler in `src/core/task/tools/handlers/`, wire in `ToolExecutor.ts`.
6. If tool has UI: add `AsiSay` enum in proto → `ExtensionMessage.ts` → `Asi-message.ts` → `ChatRow.tsx`.
7. Regenerate snapshots: `UPDATE_SNAPSHOTS=true npm run test:unit`.

## Modifying System Prompt
Modular: `components/` (shared) + `variants/` (model-specific) + `templates/` (`{{PLACEHOLDER}}`). Variants override components via `componentOverrides` in `config.ts` or custom `template.ts`. XS variant is heavily condensed inline. Always regenerate snapshots after changes.

## Global State Keys (silent failure risk)
Adding a key requires: type in `src/shared/storage/state-keys.ts`, read via `context.globalState.get()` in `src/core/storage/utils/state-helpers.ts` `readGlobalStateFromDisk()`, and add to return object. Missing the `.get()` call compiles fine but value is always `undefined`.

## Slash Commands (3 places)
- `src/core/slash-commands/index.ts` — definitions.
- `src/core/prompts/commands.ts` — system prompt integration.
- `webview-ui/src/utils/slash-commands.ts` — webview autocomplete.

## Conventions
- **Paths**: Always use `src/utils/path` helpers (`toPosixString`) for cross-platform compatibility.
- **Logging**: `src/shared/services/Logger.ts`.
- **Feature flags**: See PR #7566 as reference pattern.
