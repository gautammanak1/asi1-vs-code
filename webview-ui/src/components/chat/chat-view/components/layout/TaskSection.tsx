import { AsiMessage } from "@shared/ExtensionMessage"
import React from "react"
import TaskHeader from "@/components/chat/task-header/TaskHeader"
import { MessageHandlers } from "../../types/chatTypes"

interface TaskSectionProps {
	task: AsiMessage
	messageHandlers: MessageHandlers
	lastProgressMessageText?: string
	showFocusChainPlaceholder?: boolean
}

export const TaskSection: React.FC<TaskSectionProps> = ({
	task,
	messageHandlers,
	lastProgressMessageText,
	showFocusChainPlaceholder,
}) => {
	return (
		<TaskHeader
			lastProgressMessageText={lastProgressMessageText}
			onClose={messageHandlers.handleTaskCloseButtonClick}
			onSendMessage={messageHandlers.handleSendMessage}
			showFocusChainPlaceholder={showFocusChainPlaceholder}
			task={task}
		/>
	)
}
