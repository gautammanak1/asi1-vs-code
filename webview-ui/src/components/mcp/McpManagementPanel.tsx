import { EmptyRequest } from "@shared/proto/Asi/common";
import { VSCodeButton } from "@vscode/webview-ui-toolkit/react";
import { PlugZapIcon } from "lucide-react";
import { useExtensionState } from "@/context/ExtensionStateContext";
import { McpServiceClient } from "@/services/grpc-client";
import ServersToggleList from "./configuration/tabs/installed/ServersToggleList";

/**
 * Workspace `.fetch-coder/mcp.json` merges over global MCP settings (extension host).
 */
const McpManagementPanel = () => {
	const { mcpServers: servers, remoteConfigSettings } = useExtensionState();

	const hasRemoteMCPServers =
		remoteConfigSettings?.remoteMCPServers &&
		remoteConfigSettings.remoteMCPServers.length > 0;

	return (
		<div className="fc-mcp-panel space-y-4 px-4 py-3">
			<div className="rounded-[10px] border border-border/80 bg-card/40 p-3 space-y-2">
				<div className="flex items-center gap-2 text-sm font-semibold text-foreground">
					<PlugZapIcon className="size-4 text-[var(--color-fetch-lime)]" />
					MCP servers
				</div>
				<p className="text-xs leading-relaxed text-muted-foreground m-0">
					<strong className="text-foreground">Workspace:</strong>{" "}
					<code className="text-[11px]">.fetch-coder/mcp.json</code> — merged over global{" "}
					<code className="text-[11px]">Asi_mcp_settings.json</code>. Format:{" "}
					<code className="text-[11px]">{`{ "mcpServers": { "name": { "command", "args", "env" } } }`}</code>
					.
				</p>
			</div>

			{hasRemoteMCPServers && (
				<div className="flex items-center gap-2 rounded-[10px] border border-border px-3 py-2 text-xs bg-muted/30">
					<span className="codicon codicon-lock" />
					Some servers are managed by your organization.
				</div>
			)}

			<ServersToggleList hasTrashIcon={true} isExpandable={true} servers={servers} />

			<VSCodeButton
				appearance="primary"
				onClick={() => {
					McpServiceClient.openMcpSettings(EmptyRequest.create({})).catch(console.error);
				}}
				style={{ width: "100%" }}
			>
				<span className="codicon codicon-json" style={{ marginRight: 8 }} />
				Edit global MCP JSON
			</VSCodeButton>

			<p className="text-[11px] text-center text-muted-foreground m-0">
				Connection status shows on each server row; tools load after connect. Use the{" "}
				<strong className="text-foreground">trash</strong> icon (or expand the row → <strong>Delete Server</strong>)
				to remove a server from config. Organization-managed servers may not allow delete.
			</p>
		</div>
	);
};

export default McpManagementPanel;
