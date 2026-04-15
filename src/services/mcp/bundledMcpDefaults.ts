import type { McpMarketplaceItem } from "@shared/mcp"

/** Remote MCP endpoint (Streamable HTTP) — same shape as Cline’s MCP settings example. */
export const COMPOSIO_MCP_URL = "https://connect.composio.dev/mcp"

/** GitHub Copilot–compatible hosted MCP (Streamable HTTP). Auth in browser when connecting. */
export const GITHUB_COPILOT_MCP_URL = "https://api.githubcopilot.com/mcp/"

/** Sentry hosted MCP (Streamable HTTP) — path `/mcp` per Sentry docs. */
export const SENTRY_HOSTED_MCP_URL = "https://mcp.sentry.dev/mcp"

/** Fetch Agentverse MCP (SSE). Anyone can add; authenticate per Agentverse. */
export const AGENTVERSE_MCP_SSE_URL = "https://mcp.agentverse.ai/sse"

/**
 * Default remote servers merged into `Asi_mcp_settings.json` when missing (first run or legacy empty config).
 * Users can edit or remove entries in the MCP settings file.
 */
export const BUNDLED_REMOTE_MCP_SERVER_ENTRIES: Record<string, Record<string, unknown>> = {
	composio: {
		url: COMPOSIO_MCP_URL,
		type: "streamableHttp",
		disabled: false,
	},
	github: {
		url: GITHUB_COPILOT_MCP_URL,
		type: "streamableHttp",
		disabled: false,
	},
	sentry: {
		url: SENTRY_HOSTED_MCP_URL,
		type: "streamableHttp",
		disabled: false,
	},
	agentverse: {
		url: AGENTVERSE_MCP_SSE_URL,
		type: "sse",
		disabled: false,
	},
}

export function mergeBundledRemoteMcpServers(mcpServers: Record<string, unknown>): boolean {
	let changed = false
	for (const [name, entry] of Object.entries(BUNDLED_REMOTE_MCP_SERVER_ENTRIES)) {
		if (mcpServers[name] === undefined) {
			mcpServers[name] = { ...entry }
			changed = true
		}
	}
	return changed
}

/** Shown in MCP Marketplace even when the remote catalog API is empty or offline. */
export function getBundledMcpMarketplaceItems(): McpMarketplaceItem[] {
	const now = new Date().toISOString()
	return [
		{
			mcpId: "composio",
			githubUrl: "https://github.com/ComposioHQ/composio",
			name: "Composio",
			author: "Composio",
			description:
				"Connect Composio’s hosted MCP, then enable toolkits (Slack, GitHub, Gmail, …) in your Composio dashboard. Tools are exposed to Fetch Coder automatically via MCP list_tools after you authorize.",
			codiconIcon: "plug",
			logoUrl: "",
			category: "Integrations",
			tags: ["remote", "oauth", "integrations", "streamableHttp", "composio"],
			requiresApiKey: false,
			readmeContent:
				"Composio toolkits are configured in the Composio product, not inside VS Code: add this MCP server, complete OAuth when prompted, then pick the apps/toolkits you want at https://docs.composio.dev/toolkits — Fetch Coder will use whatever tools the Composio MCP server advertises for your account.",
			llmsInstallationContent:
				"After the composio server is in Asi_mcp_settings.json and connected: (1) Open the Composio dashboard and connect the integrations you need. (2) Each toolkit adds MCP tools that appear in chat when MCP is enabled. (3) See https://docs.composio.dev/toolkits for the full catalog.",
			isRecommended: true,
			githubStars: 0,
			downloadCount: 0,
			createdAt: now,
			updatedAt: now,
			lastGithubSync: now,
		},
		{
			mcpId: "github",
			githubUrl: "https://github.com/features/copilot",
			name: "GitHub Copilot MCP",
			author: "GitHub",
			description:
				"Hosted MCP at api.githubcopilot.com (Streamable HTTP). Connect and complete GitHub auth in the browser — same pattern as Composio.",
			codiconIcon: "github",
			logoUrl: "",
			category: "Developer tools",
			tags: ["github", "copilot", "streamableHttp", "remote", "oauth"],
			requiresApiKey: false,
			readmeContent:
				"Adds a remote entry pointing at https://api.githubcopilot.com/mcp/ . Sign in with GitHub when prompted so tools can access resources you authorize.",
			llmsInstallationContent:
				"After install, open MCP Configure and ensure the server shows connected (green). Use Edit global MCP JSON if you need static headers.",
			isRecommended: true,
			githubStars: 0,
			downloadCount: 0,
			createdAt: now,
			updatedAt: now,
			lastGithubSync: now,
		},
		{
			mcpId: "github-mcp-official",
			githubUrl: "https://github.com/github/github-mcp-server",
			name: "GitHub (official MCP)",
			author: "GitHub",
			description:
				"Official GitHub MCP server (stdio). After install, set GITHUB_PERSONAL_ACCESS_TOKEN in the server env in Asi_mcp_settings.json or your shell environment.",
			codiconIcon: "github",
			logoUrl: "",
			category: "Developer tools",
			tags: ["github", "stdio", "official", "mcp"],
			requiresApiKey: true,
			readmeContent:
				"This adds `@modelcontextprotocol/server-github` via npx. Create a fine-scoped GitHub PAT and set `GITHUB_PERSONAL_ACCESS_TOKEN` in the MCP server `env` block (see MCP settings file). Docs: https://github.com/github/github-mcp-server",
			llmsInstallationContent:
				"One-click install writes a stdio entry. If connection fails, verify Node/npx on PATH and your PAT.",
			isRecommended: true,
			githubStars: 0,
			downloadCount: 0,
			createdAt: now,
			updatedAt: now,
			lastGithubSync: now,
		},
		{
			mcpId: "sentry",
			githubUrl: "https://github.com/getsentry/sentry-mcp",
			name: "Sentry MCP",
			author: "Sentry",
			description:
				"Sentry hosted MCP (Streamable HTTP) at https://mcp.sentry.dev/mcp — complete auth in the browser when prompted.",
			codiconIcon: "bug",
			logoUrl: "",
			category: "Observability",
			tags: ["sentry", "errors", "streamableHttp", "mcp"],
			requiresApiKey: false,
			readmeContent:
				"Remote MCP per https://github.com/getsentry/sentry-mcp — OAuth in browser when connecting. Advanced: stdio via `npx @sentry/mcp-server` with SENTRY_ACCESS_TOKEN.",
			llmsInstallationContent:
				"If the remote connection fails, check network/VPN and try again; see Sentry MCP docs for token-based stdio.",
			isRecommended: true,
			githubStars: 0,
			downloadCount: 0,
			createdAt: now,
			updatedAt: now,
			lastGithubSync: now,
		},
		{
			mcpId: "agentverse",
			githubUrl: "https://github.com/fetchai/uAgents",
			name: "Agentverse MCP",
			author: "Fetch.ai",
			description:
				"SSE endpoint at https://mcp.agentverse.ai/sse — add like Composio; authenticate via Agentverse / Fetch when prompted.",
			codiconIcon: "globe",
			logoUrl: "",
			category: "Agents",
			tags: ["fetch", "agentverse", "sse", "agents"],
			requiresApiKey: false,
			readmeContent:
				"Public SSE MCP URL for Agentverse. Complete authentication in the browser or via headers per Fetch.ai docs. uAgents: https://github.com/fetchai/uAgents",
			llmsInstallationContent:
				"Uses transport type `sse` in Asi_mcp_settings.json. Anyone can add this server; only authorized sessions get tool access.",
			isRecommended: true,
			githubStars: 0,
			downloadCount: 0,
			createdAt: now,
			updatedAt: now,
			lastGithubSync: now,
		},
	]
}
