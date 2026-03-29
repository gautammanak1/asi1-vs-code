# Contributing to ASI1 Code

Thanks for your interest in improving **ASI1 Code**. This document explains how to set up the project, run it locally, and submit changes.

## Prerequisites

- [Node.js](https://nodejs.org/) 18+ (LTS recommended)
- [VS Code](https://code.visualstudio.com/) (for the Extension Development Host)

## Local setup

```bash
git clone https://github.com/gautammanak1/asi1-vs-code.git
cd asi1-vs-code
npm install
npm run compile
```

### Pushing this folder to the repo (first time)

If you developed in a local folder and the GitHub repo already exists (possibly with only a README):

```bash
cd /path/to/asi-assistant
git init
git remote add origin https://github.com/gautammanak1/asi1-vs-code.git
git fetch origin
git checkout -b main
# If the remote has commits you want to keep, merge: git pull origin main --allow-unrelated-histories
git add .
git commit -m "Add ASI1 Code extension source"
git push -u origin main
```

Resolve any merge conflicts if both sides had a `README.md`.

Use **`npm run watch`** while editing TypeScript so `out/` stays up to date.

## Run the extension

1. Open this folder in VS Code.
2. Press **F5** (or **Run → Start Debugging**) to launch the **Extension Development Host**.
3. In the new window, open the **ASI1 Code** activity bar icon and use **Chat**.

## Before you open a PR

- Run `npm run compile` and fix any TypeScript errors.
- Manually exercise the flows you changed (chat, API key, settings).
- Do **not** commit `.api-key` or real API keys. They are gitignored and must stay local.

## Pull requests

1. Fork the repository and create a branch from `main`.
2. Make focused changes with clear commit messages.
3. Describe **what** changed and **why** in the PR body.
4. Link related issues if any.

## Code style

- Match existing formatting and naming in `src/`.
- Prefer small, reviewable diffs over large refactors unless discussed first.

## Security

If you find a security issue, please see [SECURITY.md](./SECURITY.md) instead of opening a public issue.
