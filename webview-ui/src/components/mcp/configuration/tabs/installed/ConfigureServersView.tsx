import { EmptyRequest } from "@shared/proto/Asi/common";
import { VSCodeButton, VSCodeLink } from "@vscode/webview-ui-toolkit/react";
import { useExtensionState } from "@/context/ExtensionStateContext";
import { McpServiceClient } from "@/services/grpc-client";
import ServersToggleList from "./ServersToggleList";

const ConfigureServersView = () => {
	const {
		mcpServers: servers,
		navigateToSettings,
		remoteConfigSettings,
	} = useExtensionState();

	// Check if there are remote MCP servers configured
	const hasRemoteMCPServers =
		remoteConfigSettings?.remoteMCPServers &&
		remoteConfigSettings.remoteMCPServers.length > 0;

	return (
		<div style={{ padding: "16px 20px" }}>
			<div
				style={{
					color: "var(--vscode-foreground)",
					fontSize: "13px",
					marginBottom: "16px",
					marginTop: "5px",
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
					marginBottom: "16px",
					padding: "8px 12px",
					background: "var(--vscode-textBlockQuote-background)",
					borderRadius: "6px",
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
				. Use the header name your provider documents.
			</div>

			{/* Remote config banner */}
			{hasRemoteMCPServers && (
				<div className="flex items-center gap-2 px-5 py-3 mb-4 bg-vscode-textBlockQuote-background border-l-[3px] border-vscode-textLink-foreground">
					<i className="codicon codicon-lock text-sm" />
					<span className="text-base">
						Your organization manages some MCP servers
					</span>
				</div>
			)}

			<ServersToggleList
				hasTrashIcon={false}
				isExpandable={true}
				servers={servers}
			/>

			{/* Settings Section */}
			<div style={{ marginBottom: "20px", marginTop: 10 }}>
				<VSCodeButton
					appearance="secondary"
					onClick={() => {
						McpServiceClient.openMcpSettings(EmptyRequest.create({})).catch(
							(error) => {
								console.error("Error opening MCP settings:", error);
							},
						);
					}}
					style={{ width: "100%", marginBottom: "5px" }}
				>
					<span
						className="codicon codicon-server"
						style={{ marginRight: "6px" }}
					></span>
					Configure MCP Servers
				</VSCodeButton>

				<div style={{ textAlign: "center" }}>
					<VSCodeLink
						onClick={() => navigateToSettings("features")}
						style={{ fontSize: "12px" }}
					>
						Advanced MCP Settings
					</VSCodeLink>
				</div>
			</div>
		</div>
	);
};

export default ConfigureServersView;
