import { McpViewTab } from "@shared/mcp";
import { EmptyRequest } from "@shared/proto/Asi/common";
import { McpServers } from "@shared/proto/Asi/mcp";
import { convertProtoMcpServersToMcpServers } from "@shared/proto-conversions/mcp/mcp-server-conversion";
import { useEffect, useState } from "react";
import styled from "styled-components";
import { useExtensionState } from "@/context/ExtensionStateContext";
import { McpServiceClient } from "@/services/grpc-client";
import ViewHeader from "../../common/ViewHeader";
import AddRemoteServerForm from "./tabs/add-server/AddRemoteServerForm";
import ConfigureServersView from "./tabs/installed/ConfigureServersView";
import McpMarketplaceView from "./tabs/marketplace/McpMarketplaceView";

type McpViewProps = {
	onDone: () => void;
	initialTab?: McpViewTab;
};

const McpConfigurationView = ({ onDone, initialTab }: McpViewProps) => {
	const { remoteConfigSettings, setMcpServers, environment } =
		useExtensionState();
	// Show marketplace by default unless remote config explicitly disables it
	const showMarketplace = remoteConfigSettings?.mcpMarketplaceEnabled !== false;
	const showRemoteServers =
		remoteConfigSettings?.blockPersonalRemoteMCPServers !== true;
	const [activeTab, setActiveTab] = useState<McpViewTab>(
		initialTab || (showMarketplace ? "marketplace" : "configure"),
	);

	const handleTabChange = (tab: McpViewTab) => {
		setActiveTab(tab);
	};

	useEffect(() => {
		if (!showMarketplace && activeTab === "marketplace") {
			// If marketplace is disabled by remote config and we're on marketplace tab, switch to configure
			setActiveTab("configure");
		}
		if (!showRemoteServers && activeTab === "addRemote") {
			setActiveTab("configure");
		}
	}, [showMarketplace, showRemoteServers, activeTab]);

	// Get setter for MCP marketplace catalog from context
	const { setMcpMarketplaceCatalog } = useExtensionState();

	useEffect(() => {
		if (showMarketplace) {
			McpServiceClient.refreshMcpMarketplace(EmptyRequest.create({}))
				.then((response) => {
					setMcpMarketplaceCatalog(response);
				})
				.catch((error) => {
					console.error("Error refreshing MCP marketplace:", error);
				});

			McpServiceClient.getLatestMcpServers(EmptyRequest.create({}))
				.then((response: McpServers) => {
					if (response.mcpServers) {
						const mcpServers = convertProtoMcpServersToMcpServers(
							response.mcpServers,
						);
						setMcpServers(mcpServers);
					}
				})
				.catch((error) => {
					console.error("Failed to fetch MCP servers:", error);
				});
		}
	}, [showMarketplace]);

	return (
		<div
			style={{
				position: "fixed",
				top: 0,
				left: 0,
				right: 0,
				bottom: 0,
				display: "flex",
				flexDirection: "column",
			}}
		>
			<ViewHeader
				environment={environment}
				onDone={onDone}
				title="MCP Servers"
			/>

			<div className="flex min-h-0 flex-1 flex-col overflow-auto bg-(--vscode-editor-background)">
				{/* Tabs container */}
				<div className="flex gap-0.5 border-b border-(--vscode-widget-border) bg-(--vscode-sideBar-background)/25 px-5 pt-2">
					{showMarketplace && (
						<TabButton
							isActive={activeTab === "marketplace"}
							onClick={() => handleTabChange("marketplace")}
						>
							Marketplace
						</TabButton>
					)}
					{showRemoteServers && (
						<TabButton
							isActive={activeTab === "addRemote"}
							onClick={() => handleTabChange("addRemote")}
						>
							Remote Servers
						</TabButton>
					)}
					<TabButton
						isActive={activeTab === "configure"}
						onClick={() => handleTabChange("configure")}
					>
						Configure
					</TabButton>
				</div>

				{/* Content container */}
				<div className="w-full min-w-0 flex-1">
					{showMarketplace && activeTab === "marketplace" && (
						<McpMarketplaceView />
					)}
					{showRemoteServers && activeTab === "addRemote" && (
						<AddRemoteServerForm
							onServerAdded={() => handleTabChange("configure")}
						/>
					)}
					{activeTab === "configure" && <ConfigureServersView />}
				</div>
			</div>
		</div>
	);
};

const StyledTabButton = styled.button.withConfig({
	shouldForwardProp: (prop) => !["isActive"].includes(prop),
})<{ isActive: boolean; disabled?: boolean }>`
	background: ${(props) =>
		props.isActive ? "var(--vscode-list-activeSelectionBackground)" : "transparent"};
	border: 1px solid
		${(props) =>
			props.isActive ? "color-mix(in srgb, var(--vscode-widget-border) 80%, transparent)" : "transparent"};
	border-bottom-color: transparent;
	border-radius: 8px 8px 0 0;
	color: ${(props) =>
		props.isActive ? "var(--vscode-foreground)" : "var(--vscode-descriptionForeground)"};
	padding: 10px 16px;
	cursor: ${(props) => (props.disabled ? "not-allowed" : "pointer")};
	font-size: 13px;
	font-weight: ${(props) => (props.isActive ? 600 : 400)};
	margin-bottom: -1px;
	font-family: inherit;
	opacity: ${(props) => (props.disabled ? 0.6 : 1)};
	pointer-events: ${(props) => (props.disabled ? "none" : "auto")};
	transition:
		background 0.15s ease,
		color 0.15s ease,
		border-color 0.15s ease;

	&:hover {
		color: ${(props) => (props.disabled ? "var(--vscode-descriptionForeground)" : "var(--vscode-foreground)")};
		background: ${(props) =>
			props.isActive
				? "var(--vscode-list-activeSelectionBackground)"
				: "var(--vscode-list-hoverBackground)"};
	}
`;

export const TabButton = ({
	children,
	isActive,
	onClick,
	disabled,
	style,
}: {
	children: React.ReactNode;
	isActive: boolean;
	onClick: () => void;
	disabled?: boolean;
	style?: React.CSSProperties;
}) => (
	<StyledTabButton
		disabled={disabled}
		isActive={isActive}
		onClick={onClick}
		style={style}
	>
		{children}
	</StyledTabButton>
);

export default McpConfigurationView;
