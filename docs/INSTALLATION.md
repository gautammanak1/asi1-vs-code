# Installation

**Fetch Coder for Cursor** works wherever standard VS Code extensions load: **Visual Studio Code**, **Cursor**, and other forks that expose the Extensions view.

## Prerequisites

- **VS Code** compatible with `"engines.vscode"` in [`package.json`](../package.json) (currently `^1.115.0`).
- Network access for Marketplace or GitHub installs.
- For **development from source**: **Node.js**, **npm**, and **Git** (see repo [CONTRIBUTING.md](../CONTRIBUTING.md); **git-lfs** is required for clones).

## Install from the marketplace

1. Open **Extensions** (Cursor or VS Code).
2. Search for **Fetch Coder**.
3. Install **Fetch Coder for Cursor** (publisher: `gautammanak2` on VS Code Marketplace item `gautammanak2.fetch-coder`).
4. Reload when prompted.

**Open VSX:** The same packaged extension can appear on Open VSX depending on publisher workflow; installs still use normal Extensions UI.

## Install from a `.vsix`

1. Download a release `.vsix` from [GitHub Releases](https://github.com/gautammanak1/asi1-vs-code/releases).
2. Command Palette → **Extensions: Install from VSIX…** and choose the file.
3. Reload the window.

## Build and run from source

```bash
git clone https://github.com/gautammanak1/asi1-vs-code.git
cd asi1-vs-code

npm run install:all
npm run protos
npm run build:webview
npm run compile
```

Press **F5** (or Run → Start Debugging) to launch an **Extension Development Host** with the extension loaded.

For day-to-day work, contributors often run `npm run dev` where applicable; see scripts in [`package.json`](../package.json).

## Configure API access

Configure your **ASI:One** key and model in the sidebar UI or VS Code Settings — see [README — Configuration](../README.md#configuration) and [CONFIGURATION.md](CONFIGURATION.md).

## Troubleshooting

- **Extension not activating:** Reload the window (**Developer: Reload Window**).
- **Webview stays blank:** Rebuild webview (`npm run build:webview`) and rebuild extension (`npm run compile`).
- **More help:** [README § troubleshooting patterns](../README.md), [CHANGELOG](../CHANGELOG.md), or [Issues](https://github.com/gautammanak1/asi1-vs-code/issues).
