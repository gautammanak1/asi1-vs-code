# Add Fetch Coder CLI

Add the terminal-based CLI back into the Fetch Coder project.

## When to Use

Use this skill when the user asks to:
- Add CLI back to the project
- Set up terminal-based AI assistant
- Integrate CLI with the extension
- Build CLI from backup

## Steps

### 1. Check backup exists

```bash
ls ~/Desktop/fetch-coder-cli/package.json
```

If not found, inform the user the backup is missing.

### 2. Copy CLI into project

```bash
cp -r ~/Desktop/fetch-coder-cli ./cli
```

### 3. Update package.json

Add `"cli"` to the `workspaces` array:

```json
"workspaces": [".", "cli"]
```

Add these scripts:

```json
"cli:link": "cd cli && npm run link",
"cli:build": "npm run protos && cd cli && npm run build",
"cli:run": "node cli/dist/cli.mjs",
"cli:build:production": "cd cli && npm run build:production",
"cli:watch": "cd cli && npm run watch",
"cli:test": "cd cli && npm run test",
"cli:dev": "cd cli && npm run dev",
"cli:unlink": "cd cli && npm run unlink"
```

Update `check-types` to include CLI:

```json
"check-types": "npm run protos && npx tsc --noEmit && cd webview-ui && npx tsc --noEmit && cd ../cli && npx tsc --noEmit"
```

### 4. Install and build

```bash
npm install
npm run protos
npm run cli:build
```

### 5. Test

```bash
npm run cli:test
```

### 6. Optionally add CI workflows

If CLI should be published to npm, add these workflow files:
- `.github/workflows/cli-tui-tests.yml` — CLI TUI E2E tests
- `.github/workflows/publish-cli.yml` — npm publish workflow

### 7. Verify extension still works

```bash
npm run check-types
npm run build:webview
```

## Important Notes

- CLI uses the same ASI:One API (`https://api.asi1.ai/v1`, model `asi1`)
- CLI is completely independent from the VS Code extension
- Both share `src/core/` and `src/shared/` code
- CLI has its own React Ink TUI for terminal interaction
