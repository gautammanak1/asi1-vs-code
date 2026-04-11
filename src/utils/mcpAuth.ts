import crypto from "crypto"

/**
 * True when the user already configured static credentials (no OAuth flow needed).
 * Covers Bearer tokens, API keys in custom headers, etc.
 */
export function mcpConfigHasUserSuppliedCredentials(
	headers?: Record<string, string>,
): boolean {
	if (!headers) {
		return false
	}
	for (const key of Object.keys(headers)) {
		const k = key.toLowerCase()
		if (k === "authorization") {
			return true
		}
		if (k === "x-api-key" || k === "x-apikey" || k === "api-key") {
			return true
		}
	}
	return false
}

/**
 * Generates a unique hash for an MCP server based on its name and URL.
 * Used for creating unique OAuth callback paths and storage keys.
 * @param serverName The name of the MCP server.
 * @param serverUrl The URL of the MCP server.
 * @returns A SHA-256 hash string.
 */
export const getServerAuthHash = (serverName: string, serverUrl: string): string => {
	return crypto.createHash("sha256").update(`${serverName}:${serverUrl}`).digest("hex")
}

/**
 * Generates the unique OAuth callback path for a specific MCP server.
 * @param serverName The name of the MCP server.
 * @param serverUrl The URL of the MCP server.
 * @returns The callback path string (e.g., /mcp-auth/callback/<hash>).
 */
export const getMcpServerCallbackPath = (serverName: string, serverUrl: string): string => {
	const hash = getServerAuthHash(serverName, serverUrl)
	return `/mcp-auth/callback/${hash}`
}
