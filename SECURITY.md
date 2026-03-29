# Security policy

## Supported versions

We address security fixes for the **latest published** version of the ASI1 Code extension. Older versions may not receive backports.

## Reporting a vulnerability

Please **do not** open a public GitHub issue for undisclosed security vulnerabilities.

Instead:

1. Open a **[GitHub Security Advisory](https://github.com/gautammanak1/asi1-vs-code/security/advisories/new)** for this repository (if enabled), **or**
2. Email the maintainers at a contact address listed on the [publisher profile](https://marketplace.visualstudio.com/) once the extension is published, **or**
3. Open a **private** security report via GitHub if that option is available in the repo settings.

Include:

- Description of the issue and impact
- Steps to reproduce (if safe to share)
- Affected version(s) and environment (VS Code / OS) if known

We will acknowledge receipt as soon as we can and coordinate disclosure and a fix.

## API keys and secrets

- Never commit API keys, tokens, or `.api-key` files.
- Use **ASI: Set API Key** or environment variables / VS Code secret storage as documented in the README.
