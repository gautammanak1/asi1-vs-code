import React from "react"
import { QuickWinTask } from "./quickWinTasks"

interface QuickWinCardProps {
	task: QuickWinTask
	onExecute: () => void
}

const ICON_MAP: Record<string, string> = {
	RobotIcon: "codicon-hubot",
	ChatIcon: "codicon-comment-discussion",
	BrainIcon: "codicon-lightbulb",
	WebAppIcon: "codicon-dashboard",
	TerminalIcon: "codicon-terminal",
	GameIcon: "codicon-game",
}

const QuickWinCard: React.FC<QuickWinCardProps> = ({ task, onExecute }) => {
	const iconClass = ICON_MAP[task.icon || ""] || "codicon-rocket"

	return (
		<div
			className="flex items-center mb-1.5 py-2.5 px-4 space-x-3 rounded-xl cursor-pointer group transition-all duration-200 ease-out hover:scale-[1.02]"
			onClick={() => onExecute()}
			style={{ background: "#333", border: "1px solid #444" }}
		>
			<div className="shrink-0 flex items-center justify-center w-8 h-8 rounded-lg" style={{ background: "#3a3a3a" }}>
				<span className={`codicon ${iconClass} text-[18px]! leading-none!`} style={{ color: "#7CE074" }} />
			</div>

			<div className="grow min-w-0">
				<h3
					className="text-sm font-medium truncate leading-tight mb-0 mt-0"
					style={{ fontFamily: "'Lexend', sans-serif", color: "#fff" }}
				>
					{task.title}
				</h3>
				<p className="text-xs truncate leading-tight mt-0.5 mb-0" style={{ color: "#888" }}>{task.description}</p>
			</div>

			<div className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
				<span className="codicon codicon-arrow-right text-sm" style={{ color: "#7CE074" }} />
			</div>
		</div>
	)
}

export default QuickWinCard
