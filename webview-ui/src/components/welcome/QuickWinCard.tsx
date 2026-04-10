import React from "react"
import { QuickWinTask } from "./quickWinTasks"

interface QuickWinCardProps {
	task: QuickWinTask
	onExecute: () => void
}

const ICON_MAP: Record<string, { icon: string; color: string }> = {
	RobotIcon: { icon: "codicon-hubot", color: "#a3e635" },
	ChatIcon: { icon: "codicon-comment-discussion", color: "#a3e635" },
	BrainIcon: { icon: "codicon-lightbulb", color: "#a3e635" },
	WebAppIcon: { icon: "codicon-dashboard", color: "#a3e635" },
	TerminalIcon: { icon: "codicon-terminal", color: "#a3e635" },
	GameIcon: { icon: "codicon-game", color: "#a3e635" },
}

const QuickWinCard: React.FC<QuickWinCardProps> = ({ task, onExecute }) => {
	const iconInfo = ICON_MAP[task.icon || ""] || { icon: "codicon-rocket", color: "#a3e635" }

	return (
		<div
			className="flex items-center mb-1.5 py-2.5 px-4 space-x-3 rounded-xl cursor-pointer group transition-all duration-200 ease-out hover:scale-[1.02]"
			onClick={() => onExecute()}
			style={{ background: "#18181b", border: "1px solid #27272a" }}
		>
			<div className="shrink-0 flex items-center justify-center w-8 h-8 rounded-lg" style={{ background: "#27272a" }}>
				<span className={`codicon ${iconInfo.icon} text-[18px]! leading-none!`} style={{ color: iconInfo.color }} />
			</div>

			<div className="grow min-w-0">
				<h3
					className="text-sm font-medium truncate leading-tight mb-0 mt-0"
					style={{ fontFamily: "'Lexend', sans-serif", color: "#ffffff" }}
				>
					{task.title}
				</h3>
				<p className="text-xs truncate leading-tight mt-0.5 mb-0" style={{ color: "#71717a" }}>{task.description}</p>
			</div>

			<div className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
				<span className="codicon codicon-arrow-right text-sm" style={{ color: "#a3e635" }} />
			</div>
		</div>
	)
}

export default QuickWinCard
