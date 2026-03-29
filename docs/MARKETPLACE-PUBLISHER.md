# Visual Studio Marketplace — publisher profile (fill-in guide)

Use these as **templates**; replace names, emails, and URLs with your real details. The **publisher ID** must match `"publisher"` in `package.json` and what you create in the Marketplace.

## Basic information

| Field | Example / what to enter |
|--------|-------------------------|
| **Name** | `Gautam Manak` — display name shown on your publisher page (your name or brand). |
| **ID** | Must match `package.json` → `"publisher"` (e.g. `GautamManak`). Create once; hard to change. |
| **Verified domain** | Optional. Skip until you own a domain; you can add DNS verification later ([Microsoft docs](https://learn.microsoft.com/azure/devops/marketplace/verify-domain)). |

## About you

| Field | Example |
|--------|---------|
| **Description** | `Publisher of ASI1 Code — a VS Code extension for sidebar AI chat powered by the ASI1 API (streaming Markdown, code blocks, workspace file hints). Part of the Fetch.ai ecosystem.` |
| **Logo** | 128×128 PNG — use `resources/icon.png` (same artwork as the extension activity bar icon). |
| **Company website** | `https://fetch.ai` or your personal/site URL. |
| **Support** | `https://github.com/gautammanak1/asi1-vs-code/issues` or `your.email@example.com` |
| **LinkedIn** | Your profile or company page URL, or leave blank. |
| **Source code repository** | `https://github.com/gautammanak1/asi1-vs-code` |
| **Twitter / X** | Your `https://x.com/...` if you want it on the profile. |

After you create the publisher, use a [Personal Access Token](https://code.visualstudio.com/api/working-with-extensions/publishing-extension) with **Marketplace (Manage)** scope to run `vsce login` / `vsce publish`.
