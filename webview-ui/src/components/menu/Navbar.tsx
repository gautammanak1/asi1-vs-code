import { useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { TaskServiceClient } from "@/services/grpc-client"
import { cn } from "@/lib/utils"
import { useExtensionState } from "../../context/ExtensionStateContext"
import { asiDebug } from "@/utils/debug";

type NavTab = {
	id: string
	tooltip: string
	codicon: string
	navigate: () => void
}

export const Navbar = () => {
	const { navigateToHistory, navigateToSettings, navigateToMcp, navigateToChat } = useExtensionState()

	const SETTINGS_TABS: NavTab[] = useMemo(
		() => [
			{
				id: "chat",
				tooltip: "New task",
				codicon: "codicon-add",
				navigate: () => {
					TaskServiceClient.clearTask({})
						.catch((error) => {
							asiDebug.error("Failed to clear task:", error)
						})
						.finally(() => navigateToChat())
				},
			},
			{
				id: "mcp",
				tooltip: "MCP servers",
				codicon: "codicon-server",
				navigate: navigateToMcp,
			},
			{
				id: "history",
				tooltip: "History",
				codicon: "codicon-history",
				navigate: navigateToHistory,
			},
			{
				id: "settings",
				tooltip: "Settings",
				codicon: "codicon-gear",
				navigate: navigateToSettings,
			},
		],
		[navigateToChat, navigateToHistory, navigateToMcp, navigateToSettings],
	)

	return (
		<nav
			className="flex-none inline-flex justify-end gap-0.5 mb-0.5 z-10 border-none items-center mr-2 opacity-95"
			id="Asi-navbar-container"
		>
			{SETTINGS_TABS.map((tab) => (
				<Tooltip key={`navbar-tooltip-${tab.id}`}>
					<TooltipContent side="bottom">{tab.tooltip}</TooltipContent>
					<TooltipTrigger asChild>
						<Button
							aria-label={tab.tooltip}
							className="p-0 h-7 w-7 rounded-sm hover:bg-(--vscode-toolbar-hoverBackground)"
							data-testid={`tab-${tab.id}`}
							onClick={() => tab.navigate()}
							size="icon"
							variant="icon"
						>
							<span
								className={cn("codicon", tab.codicon)}
								style={{ fontSize: "16px", lineHeight: 1 }}
							/>
						</Button>
					</TooltipTrigger>
				</Tooltip>
			))}
		</nav>
	)
}
