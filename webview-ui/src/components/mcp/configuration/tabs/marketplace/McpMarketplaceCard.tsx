import { McpMarketplaceItem, McpServer } from "@shared/mcp";
import { StringRequest } from "@shared/proto/Asi/common";
import { useEffect, useState } from "react";
import styled from "styled-components";
import { cn } from "@/lib/utils";
import { useExtensionState } from "@/context/ExtensionStateContext";
import { McpServiceClient } from "@/services/grpc-client";
import { asiDebug } from "@/utils/debug";

interface McpMarketplaceCardProps {
	item: McpMarketplaceItem;
	installedServers: McpServer[];
	setError: (error: string | null) => void;
}

const McpMarketplaceCard = ({
	item,
	installedServers,
	setError,
}: McpMarketplaceCardProps) => {
	const isInstalled = installedServers.some(
		(server) => server.name === item.mcpId,
	);
	const [isDownloading, setIsDownloading] = useState(false);
	const { onRelinquishControl } = useExtensionState();

	useEffect(() => {
		return onRelinquishControl(() => {
			setIsDownloading(false);
		});
	}, [onRelinquishControl]);

	return (
		<a
			className={cn(
				"mcp-marketplace-card group flex flex-col gap-2 rounded-lg border border-(--vscode-widget-border) bg-(--vscode-sideBar-background) p-3 no-underline text-inherit transition-colors duration-150",
				"hover:border-(--vscode-focusBorder)/50 hover:bg-(--vscode-list-hoverBackground)",
				isDownloading && "pointer-events-none opacity-80",
			)}
			href={item.githubUrl}
			rel="noreferrer"
			target="_blank"
		>
			<div className="flex gap-3 min-w-0">
				{item.logoUrl ? (
					<img
						alt=""
						className="h-11 w-11 shrink-0 rounded-lg object-cover ring-1 ring-(--vscode-widget-border)"
						src={item.logoUrl}
					/>
				) : null}

				<div className="flex min-w-0 flex-1 flex-col gap-2">
					<div className="flex items-start justify-between gap-3">
						<h3 className="m-0 text-[13px] font-semibold leading-tight text-(--vscode-foreground) group-hover:text-(--vscode-foreground)">
							{item.name}
						</h3>
						<div
							onClick={async (e) => {
								e.preventDefault();
								e.stopPropagation();
								if (!isInstalled && !isDownloading) {
									setIsDownloading(true);
									try {
										const response = await McpServiceClient.downloadMcp(
											StringRequest.create({ value: item.mcpId }),
										);
										if (response.error) {
											asiDebug.error("MCP download failed:", response.error);
											setError(response.error);
										} else {
											setError(null);
										}
									} catch (error) {
										asiDebug.error("Failed to download MCP:", error);
									} finally {
										setIsDownloading(false);
									}
								}
							}}
						>
							<StyledInstallButton
								$isInstalled={isInstalled}
								disabled={isInstalled || isDownloading}
							>
								{isInstalled
									? "Installed"
									: isDownloading
										? "Installing..."
										: "Install"}
							</StyledInstallButton>
						</div>
					</div>

					<div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-(--vscode-descriptionForeground)">
						<span className="inline-flex min-w-0 items-center gap-1">
							<span className="codicon codicon-github shrink-0 text-[14px] opacity-80" />
							<span className="truncate">{item.author}</span>
						</span>
						<span className="inline-flex items-center gap-1 tabular-nums">
							<span className="codicon codicon-star-full opacity-80" />
							{item.githubStars?.toLocaleString() ?? 0}
						</span>
						<span className="inline-flex items-center gap-1 tabular-nums">
							<span className="codicon codicon-cloud-download opacity-80" />
							{item.downloadCount?.toLocaleString() ?? 0}
						</span>
						{item.requiresApiKey ? (
							<span
								className="codicon codicon-key opacity-80"
								title="Requires API key"
							/>
						) : null}
					</div>
				</div>
			</div>

			<p className="m-0 text-[13px] leading-snug text-(--vscode-foreground)/90">
				{item.description}
			</p>

			<div
				className="relative flex gap-1.5 overflow-x-auto scrollbar-none"
				onScroll={(e) => {
					const target = e.currentTarget;
					const gradient = target.querySelector(".tags-gradient") as HTMLElement;
					if (gradient) {
						gradient.style.visibility =
							target.scrollLeft > 0 ? "hidden" : "visible";
					}
				}}
			>
				<span className="inline-flex shrink-0 rounded-md border border-(--vscode-widget-border) px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-(--vscode-descriptionForeground)">
					{item.category}
				</span>
				{item.tags.map((tag) => (
					<span
						className="inline-flex shrink-0 rounded-md border border-(--vscode-widget-border) px-2 py-0.5 text-[10px] text-(--vscode-descriptionForeground)"
						key={tag}
					>
						{tag}
					</span>
				))}
				<div className="tags-gradient pointer-events-none absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-r from-transparent to-(--vscode-editor-background)" />
			</div>
		</a>
	);
};

const StyledInstallButton = styled.button<{ $isInstalled?: boolean }>`
	font-size: 12px;
	font-weight: 500;
	padding: 4px 10px;
	border-radius: 6px;
	border: none;
	cursor: pointer;
	background: ${(props) =>
		props.$isInstalled
			? "var(--vscode-button-secondaryBackground)"
			: "var(--vscode-button-background)"};
	color: var(--vscode-button-foreground);

	&:hover:not(:disabled) {
		background: ${(props) =>
			props.$isInstalled
				? "var(--vscode-button-secondaryHoverBackground)"
				: "var(--vscode-button-hoverBackground)"};
	}

	&:active:not(:disabled) {
		background: ${(props) =>
			props.$isInstalled
				? "var(--vscode-button-secondaryBackground)"
				: "var(--vscode-button-background)"};
		opacity: 0.7;
	}

	&:disabled {
		opacity: 0.5;
		cursor: default;
	}
`;

export default McpMarketplaceCard;
