import { VSCodeLink } from "@vscode/webview-ui-toolkit/react";
import McpManagementPanel from "@/components/mcp/McpManagementPanel";
import { useExtensionState } from "@/context/ExtensionStateContext";

const ConfigureServersView = () => {
	const { navigateToSettings } = useExtensionState();

	return (
		<div style={{ padding: "0" }}>
			<div
				style={{
					color: "var(--vscode-foreground)",
					fontSize: "13px",
					padding: "16px 20px 0",
					marginBottom: "8px",
				}}
			>
				Connect to{" "}
				<VSCodeLink
					href="https://github.com/modelcontextprotocol"
					style={{ display: "inline" }}
				>
					MCP servers
				</VSCodeLink>{" "}
				to extend Fetch Coder with external tools, APIs, and data sources.{" "}
				<VSCodeLink
					href="https://innovationlab.fetch.ai/resources/docs/mcp-integration/what-is-mcp"
					style={{ display: "inline" }}
				>
					Learn more.
				</VSCodeLink>
			</div>
			<div
				style={{
					color: "var(--vscode-descriptionForeground)",
					fontSize: "12px",
					margin: "0 20px 12px",
					padding: "8px 12px",
					background: "var(--vscode-textBlockQuote-background)",
					borderRadius: "10px",
				}}
			>
				<strong>Tip (API keys):</strong> Prefer static headers so the client does not start OAuth. Examples in{" "}
				<code style={{ fontSize: "11px" }}>mcpSettings.json</code>:{" "}
				<code style={{ fontSize: "11px" }}>
					"headers": {'{'} "Authorization": "Bearer …" {'}'}
				</code>{" "}
				or{" "}
				<code style={{ fontSize: "11px" }}>
					"headers": {'{'} "X-API-Key": "…" {'}'}
				</code>
				.
			</div>

			<McpManagementPanel />

			<div style={{ textAlign: "center", padding: "8px 12px 16px" }}>
				<VSCodeLink
					onClick={() => navigateToSettings("features")}
					style={{ fontSize: "12px" }}
				>
					Advanced MCP Settings
				</VSCodeLink>
			</div>
		</div>
	);
};

export default ConfigureServersView;
