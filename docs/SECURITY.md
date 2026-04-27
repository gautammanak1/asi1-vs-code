# Security & privacy notes

Fetch Coder (**Fetch Coder for Cursor** extension) interacts with **your workspace**, **local VS Code / Cursor APIs**, **ASI:One-compatible endpoints** you configure, and optional analytics as described below.

## API keys & secrets

- **ASI:One**: Configure via `asiAssistant.apiKey` ([CONFIGURATION.md](CONFIGURATION.md)) and/or **`ASI_ONE_API_KEY`** in the environment, as documented in the [README](../README.md). Treat keys like any production credential: do not commit them to git.
- Prefer **Secrets** / credential storage workflows supported by VS Code for sensitive values rather than plaintext in workspace `.vscode/settings.json` when sharing repos.

## Product telemetry & logs

Optional **usage and diagnostics** can be toggled under **Fetch Coder → Settings → General** (“Allow error and usage reporting”). Your editor-wide **telemetry** setting can disable client telemetry that extensions rely on.

For troubleshooting, extension log output appears under **View → Output** when you select channel **`Asi`** (see README).

Official privacy terms for hosted services belong to **[asi1.ai](https://asi1.ai)** and linked policies there.

## Reporting security vulnerabilities

Report security vulnerabilities **privately**:

- Use **[GitHub Security Advisories](https://github.com/gautammanak1/asi1-vs-code/security/advisories/new)** for this repository  
  — same expectation as described in **[CONTRIBUTING.md](../CONTRIBUTING.md)**.

Do **not** file public issues for undisclosed exploits.

## Disclaimer

Nothing in this file is legal advice or a certification. Enterprise compliance claims should come from your procurement / legal channels and upstream ASI policies.
