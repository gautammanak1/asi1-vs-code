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
			className="flex items-center mb-2 py-3 px-4 space-x-3 rounded-lg cursor-pointer group transition-all duration-200 ease-out hover:scale-[1.01] hover:shadow-md"
			onClick={() => onExecute()}
			style={{ 
				background: "linear-gradient(135deg, #1a1a1a 0%, #242424 100%)",
				border: "1px solid #333",
				boxShadow: "0 2px 8px rgba(0, 0, 0, 0.3)"
			}}
		>
			<div className="shrink-0 flex items-center justify-center w-9 h-9 rounded-md" style={{ 
				background: "linear-gradient(135deg, #0052FF15 0%, #0041CC15 100%)",
				border: "1px solid #0052FF40"
			}}>
				<span className={`codicon ${iconClass} text-[18px]! leading-none!`} style={{ color: "#0052FF" }} />
			</div>

			<div className="grow min-w-0">
				<h3
					className="text-sm font-semibold truncate leading-tight mb-0 mt-0"
					style={{ fontFamily: "'Lexend', sans-serif", color: "#fff" }}
				>
					{task.title}
				</h3>
				<p className="text-xs truncate leading-tight mt-1 mb-0" style={{ color: "#999" }}>{task.description}</p>
			</div>

			<div className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
				<span className="codicon codicon-arrow-right text-sm" style={{ color: "#0052FF" }} />
			</div>
		</div>
	)
}

export default QuickWinCard
