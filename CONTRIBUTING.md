# Contributing to ASI1 Code

Thanks for your interest in contributing. This project aims to stay **small, readable, and easy to review** — focused changes beat large drive-by refactors.

---

## Requirements

- **Node.js** 18+ (LTS recommended)
- **VS Code** (or Cursor) for the Extension Development Host
- **Git**

---

## Clone and install

```bash
git clone https://github.com/gautammanak1/asi1-vs-code.git
cd asi1-vs-code
npm install
npm run compile
```

Use **`npm run watch`** while editing TypeScript so `out/` stays current.

---

## Run the extension locally

1. Open the repo folder in VS Code.
2. **Run → Start Debugging** or press **F5**.
3. In the **Extension Development Host** window, open the ASI1 Code view and exercise chat / commands.

---

## Before you open a PR

- Run **`npm run compile`** and fix any TypeScript errors.
- Manually test flows you touched (chat, API key, settings, **Create Agentverse uAgent Project** if relevant).
- Keep commits focused; explain **why** in the PR description, not only **what**.

---

## Code style

- Match naming and structure in existing `src/` files.
- Prefer small, reviewable diffs.
- Do **not** commit secrets: no real API keys, and never commit `.api-key` (gitignored).

---

## Pull request checklist

| Step | Done |
|------|------|
| `npm run compile` passes | ☐ |
| Tested in Extension Development Host | ☐ |
| No secrets or large unrelated formatting churn | ☐ |

---

## Reporting issues

Include:

- VS Code / Cursor version and OS
- Extension version
- Steps to reproduce
- Expected vs actual behavior
- Relevant settings (redact API keys)

---

## Security

Do **not** open public issues for security vulnerabilities. See [SECURITY.md](./SECURITY.md).

---

Thank you for helping improve ASI1 Code.
