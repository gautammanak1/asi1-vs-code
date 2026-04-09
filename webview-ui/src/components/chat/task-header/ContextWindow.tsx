import React, { memo, useCallback } from "react"
import CompactTaskButton from "./buttons/CompactTaskButton"

interface ContextWindowProps {
	useAutoCondense?: boolean
	onSendMessage?: (command: string, files: string[], images: string[]) => void
}

const ContextWindow: React.FC<ContextWindowProps> = ({ onSendMessage }) => {
	const handleCompact = useCallback(
		(e: React.MouseEvent<HTMLButtonElement>) => {
			e.preventDefault()
			e.stopPropagation()
			onSendMessage?.("/compact", [], [])
		},
		[onSendMessage],
	)

	return onSendMessage ? (
		<div className="flex flex-row items-center justify-end gap-2 my-1.5 text-xs text-description">
			<CompactTaskButton onClick={handleCompact} />
		</div>
	) : null
}

export default memo(ContextWindow)
