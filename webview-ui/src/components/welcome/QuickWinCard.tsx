import React from "react"
import { QuickWinTask } from "./quickWinTasks"

interface QuickWinCardProps {
	task: QuickWinTask
	onExecute: () => void
}

const ICON_COLORS: Record<string, string> = {
	RobotIcon: "#06b6d4",
	ChatIcon: "#8b5cf6",
	BrainIcon: "#f59e0b",
	WebAppIcon: "#10b981",
}

const renderIcon = (iconName?: string) => {
	if (!iconName) {
		return <span className="codicon codicon-rocket text-[22px]! leading-none!"></span>
	}

	let iconClass = "codicon-rocket"
	switch (iconName) {
		case "WebAppIcon":
			iconClass = "codicon-dashboard"
			break
		case "TerminalIcon":
			iconClass = "codicon-terminal"
			break
		case "GameIcon":
			iconClass = "codicon-game"
			break
		case "RobotIcon":
			iconClass = "codicon-hubot"
			break
		case "ChatIcon":
			iconClass = "codicon-comment-discussion"
			break
		case "BrainIcon":
			iconClass = "codicon-lightbulb"
			break
		default:
			break
	}
	return (
		<span
			className={`codicon ${iconClass} text-[20px]! leading-none!`}
			style={{ color: ICON_COLORS[iconName] || "var(--vscode-icon-foreground)" }}
		></span>
	)
}

const QuickWinCard: React.FC<QuickWinCardProps> = ({ task, onExecute }) => {
	return (
		<div
			className="glass glow-border flex items-center mb-2 py-2.5 px-4 space-x-3 rounded-xl cursor-pointer group transition-all duration-200 ease-out hover:scale-[1.02]"
			onClick={() => onExecute()}
		>
			<div className="shrink-0 flex items-center justify-center w-8 h-8 rounded-lg" style={{ background: "rgba(255,255,255,0.04)" }}>
				{renderIcon(task.icon)}
			</div>

			<div className="grow min-w-0">
				<h3
					className="text-sm font-medium truncate leading-tight mb-0 mt-0"
					style={{ fontFamily: "'Lexend', sans-serif", color: "var(--vscode-editor-foreground)" }}
				>
					{task.title}
				</h3>
				<p className="text-xs truncate leading-tight mt-0.5 mb-0" style={{ color: "var(--vscode-descriptionForeground)" }}>{task.description}</p>
			</div>

			<div className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
				<span className="codicon codicon-arrow-right text-sm" style={{ color: "#06b6d4" }} />
			</div>
		</div>
	)
}

export default QuickWinCard
