import type { McpMarketplaceItem } from "@shared/mcp"

/** Remote MCP endpoint (Streamable HTTP) — same shape as Cline’s MCP settings example. */
export const COMPOSIO_MCP_URL = "https://connect.composio.dev/mcp"

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
	]
}
