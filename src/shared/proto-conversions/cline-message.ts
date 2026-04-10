import {
	AsiAsk as AppAsiAsk,
	AsiMessage as AppAsiMessage,
	AsiSay as AppAsiSay,
} from "@shared/ExtensionMessage";
import {
	ClineAsk as AsiAsk,
	ClineMessageType as AsiMessageType,
	ClineSay as AsiSay,
	ClineMessage as ProtoAsiMessage,
} from "@shared/proto/Asi/ui";

// Helper function to convert AsiAsk string to enum
function convertAsiAskToProtoEnum(
	ask: AppAsiAsk | undefined,
): AsiAsk | undefined {
	if (!ask) {
		return undefined;
	}

	const mapping: Record<AppAsiAsk, AsiAsk> = {
		followup: AsiAsk.FOLLOWUP,
		plan_mode_respond: AsiAsk.PLAN_MODE_RESPOND,
		act_mode_respond: AsiAsk.ACT_MODE_RESPOND,
		command: AsiAsk.COMMAND,
		command_output: AsiAsk.COMMAND_OUTPUT,
		completion_result: AsiAsk.COMPLETION_RESULT,
		tool: AsiAsk.TOOL,
		api_req_failed: AsiAsk.API_REQ_FAILED,
		resume_task: AsiAsk.RESUME_TASK,
		resume_completed_task: AsiAsk.RESUME_COMPLETED_TASK,
		mistake_limit_reached: AsiAsk.MISTAKE_LIMIT_REACHED,
		browser_action_launch: AsiAsk.BROWSER_ACTION_LAUNCH,
		use_mcp_server: AsiAsk.USE_MCP_SERVER,
		new_task: AsiAsk.NEW_TASK,
		condense: AsiAsk.CONDENSE,
		summarize_task: AsiAsk.SUMMARIZE_TASK,
		report_bug: AsiAsk.REPORT_BUG,
		use_subagents: AsiAsk.USE_SUBAGENTS,
	};

	const result = mapping[ask];
	if (result === undefined) {
	}
	return result;
}

// Helper function to convert AsiAsk enum to string
function convertProtoEnumToAsiAsk(ask: AsiAsk): AppAsiAsk | undefined {
	if (ask === AsiAsk.UNRECOGNIZED) {
		return undefined;
	}

	const mapping: Record<Exclude<AsiAsk, AsiAsk.UNRECOGNIZED>, AppAsiAsk> = {
		[AsiAsk.FOLLOWUP]: "followup",
		[AsiAsk.PLAN_MODE_RESPOND]: "plan_mode_respond",
		[AsiAsk.ACT_MODE_RESPOND]: "act_mode_respond",
		[AsiAsk.COMMAND]: "command",
		[AsiAsk.COMMAND_OUTPUT]: "command_output",
		[AsiAsk.COMPLETION_RESULT]: "completion_result",
		[AsiAsk.TOOL]: "tool",
		[AsiAsk.API_REQ_FAILED]: "api_req_failed",
		[AsiAsk.RESUME_TASK]: "resume_task",
		[AsiAsk.RESUME_COMPLETED_TASK]: "resume_completed_task",
		[AsiAsk.MISTAKE_LIMIT_REACHED]: "mistake_limit_reached",
		[AsiAsk.BROWSER_ACTION_LAUNCH]: "browser_action_launch",
		[AsiAsk.USE_MCP_SERVER]: "use_mcp_server",
		[AsiAsk.NEW_TASK]: "new_task",
		[AsiAsk.CONDENSE]: "condense",
		[AsiAsk.SUMMARIZE_TASK]: "summarize_task",
		[AsiAsk.REPORT_BUG]: "report_bug",
		[AsiAsk.USE_SUBAGENTS]: "use_subagents",
	};

	return mapping[ask];
}

// Helper function to convert AsiSay string to enum
function convertAsiSayToProtoEnum(
	say: AppAsiSay | undefined,
): AsiSay | undefined {
	if (!say) {
		return undefined;
	}

	const mapping: Record<AppAsiSay, AsiSay> = {
		task: AsiSay.TASK,
		error: AsiSay.ERROR,
		api_req_started: AsiSay.API_REQ_STARTED,
		api_req_finished: AsiSay.API_REQ_FINISHED,
		text: AsiSay.TEXT,
		reasoning: AsiSay.REASONING,
		completion_result: AsiSay.COMPLETION_RESULT_SAY,
		user_feedback: AsiSay.USER_FEEDBACK,
		user_feedback_diff: AsiSay.USER_FEEDBACK_DIFF,
		api_req_retried: AsiSay.API_REQ_RETRIED,
		command: AsiSay.COMMAND_SAY,
		command_output: AsiSay.COMMAND_OUTPUT_SAY,
		tool: AsiSay.TOOL_SAY,
		shell_integration_warning: AsiSay.SHELL_INTEGRATION_WARNING,
		shell_integration_warning_with_suggestion: AsiSay.SHELL_INTEGRATION_WARNING,
		browser_action_launch: AsiSay.BROWSER_ACTION_LAUNCH_SAY,
		browser_action: AsiSay.BROWSER_ACTION,
		browser_action_result: AsiSay.BROWSER_ACTION_RESULT,
		mcp_server_request_started: AsiSay.MCP_SERVER_REQUEST_STARTED,
		mcp_server_response: AsiSay.MCP_SERVER_RESPONSE,
		mcp_notification: AsiSay.MCP_NOTIFICATION,
		use_mcp_server: AsiSay.USE_MCP_SERVER_SAY,
		diff_error: AsiSay.DIFF_ERROR,
		deleted_api_reqs: AsiSay.DELETED_API_REQS,
		Asiignore_error: AsiSay.CLINEIGNORE_ERROR,
		command_permission_denied: AsiSay.COMMAND_PERMISSION_DENIED,
		checkpoint_created: AsiSay.CHECKPOINT_CREATED,
		load_mcp_documentation: AsiSay.LOAD_MCP_DOCUMENTATION,
		info: AsiSay.INFO,
		task_progress: AsiSay.TASK_PROGRESS,
		error_retry: AsiSay.ERROR_RETRY,
		hook_status: AsiSay.HOOK_STATUS,
		hook_output_stream: AsiSay.HOOK_OUTPUT_STREAM,
		conditional_rules_applied: AsiSay.CONDITIONAL_RULES_APPLIED,
		subagent: AsiSay.SUBAGENT_STATUS,
		use_subagents: AsiSay.USE_SUBAGENTS_SAY,
		subagent_usage: AsiSay.SUBAGENT_USAGE,
		generate_explanation: AsiSay.GENERATE_EXPLANATION,
	};

	const result = mapping[say];

	return result;
}

// Helper function to convert AsiSay enum to string
function convertProtoEnumToAsiSay(say: AsiSay): AppAsiSay | undefined {
	if (say === AsiSay.UNRECOGNIZED) {
		return undefined;
	}

	const mapping: Record<Exclude<AsiSay, AsiSay.UNRECOGNIZED>, AppAsiSay> = {
		[AsiSay.TASK]: "task",
		[AsiSay.ERROR]: "error",
		[AsiSay.API_REQ_STARTED]: "api_req_started",
		[AsiSay.API_REQ_FINISHED]: "api_req_finished",
		[AsiSay.TEXT]: "text",
		[AsiSay.REASONING]: "reasoning",
		[AsiSay.COMPLETION_RESULT_SAY]: "completion_result",
		[AsiSay.USER_FEEDBACK]: "user_feedback",
		[AsiSay.USER_FEEDBACK_DIFF]: "user_feedback_diff",
		[AsiSay.API_REQ_RETRIED]: "api_req_retried",
		[AsiSay.COMMAND_SAY]: "command",
		[AsiSay.COMMAND_OUTPUT_SAY]: "command_output",
		[AsiSay.TOOL_SAY]: "tool",
		[AsiSay.SHELL_INTEGRATION_WARNING]: "shell_integration_warning",
		[AsiSay.BROWSER_ACTION_LAUNCH_SAY]: "browser_action_launch",
		[AsiSay.BROWSER_ACTION]: "browser_action",
		[AsiSay.BROWSER_ACTION_RESULT]: "browser_action_result",
		[AsiSay.MCP_SERVER_REQUEST_STARTED]: "mcp_server_request_started",
		[AsiSay.MCP_SERVER_RESPONSE]: "mcp_server_response",
		[AsiSay.MCP_NOTIFICATION]: "mcp_notification",
		[AsiSay.USE_MCP_SERVER_SAY]: "use_mcp_server",
		[AsiSay.DIFF_ERROR]: "diff_error",
		[AsiSay.DELETED_API_REQS]: "deleted_api_reqs",
		[AsiSay.CLINEIGNORE_ERROR]: "Asiignore_error",
		[AsiSay.COMMAND_PERMISSION_DENIED]: "command_permission_denied",
		[AsiSay.CHECKPOINT_CREATED]: "checkpoint_created",
		[AsiSay.LOAD_MCP_DOCUMENTATION]: "load_mcp_documentation",
		[AsiSay.INFO]: "info",
		[AsiSay.TASK_PROGRESS]: "task_progress",
		[AsiSay.ERROR_RETRY]: "error_retry",
		[AsiSay.GENERATE_EXPLANATION]: "generate_explanation",
		[AsiSay.HOOK_STATUS]: "hook_status",
		[AsiSay.HOOK_OUTPUT_STREAM]: "hook_output_stream",
		[AsiSay.CONDITIONAL_RULES_APPLIED]: "conditional_rules_applied",
		[AsiSay.SUBAGENT_STATUS]: "subagent",
		[AsiSay.USE_SUBAGENTS_SAY]: "use_subagents",
		[AsiSay.SUBAGENT_USAGE]: "subagent_usage",
	};

	return mapping[say];
}

/**
 * Convert application AsiMessage to proto AsiMessage
 */
export function convertAsiMessageToProto(
	message: AppAsiMessage,
): ProtoAsiMessage {
	// For sending messages, we need to provide values for required proto fields
	const askEnum = message.ask
		? convertAsiAskToProtoEnum(message.ask)
		: undefined;
	const sayEnum = message.say
		? convertAsiSayToProtoEnum(message.say)
		: undefined;

	// Determine appropriate enum values based on message type
	let finalAskEnum: AsiAsk = AsiAsk.FOLLOWUP; // Proto default
	let finalSayEnum: AsiSay = AsiSay.TEXT; // Proto default

	if (message.type === "ask") {
		finalAskEnum = askEnum ?? AsiAsk.FOLLOWUP; // Use FOLLOWUP as default for ask messages
	} else if (message.type === "say") {
		finalSayEnum = sayEnum ?? AsiSay.TEXT; // Use TEXT as default for say messages
	}

	const protoMessage: ProtoAsiMessage = {
		ts: message.ts,
		type: message.type === "ask" ? AsiMessageType.ASK : AsiMessageType.SAY,
		ask: finalAskEnum,
		say: finalSayEnum,
		text: message.text ?? "",
		reasoning: message.reasoning ?? "",
		images: message.images ?? [],
		files: message.files ?? [],
		partial: message.partial ?? false,
		lastCheckpointHash: message.lastCheckpointHash ?? "",
		isCheckpointCheckedOut: message.isCheckpointCheckedOut ?? false,
		isOperationOutsideWorkspace: message.isOperationOutsideWorkspace ?? false,
		conversationHistoryIndex: message.conversationHistoryIndex ?? 0,
		conversationHistoryDeletedRange: message.conversationHistoryDeletedRange
			? {
					startIndex: message.conversationHistoryDeletedRange[0],
					endIndex: message.conversationHistoryDeletedRange[1],
				}
			: undefined,
		// Additional optional fields for specific ask/say types
		sayTool: undefined,
		sayBrowserAction: undefined,
		browserActionResult: undefined,
		askUseMcpServer: undefined,
		planModeResponse: undefined,
		askQuestion: undefined,
		askNewTask: undefined,
		apiReqInfo: undefined,
		modelInfo: message.modelInfo ?? undefined,
	};

	return protoMessage;
}

/**
 * Convert proto AsiMessage to application AsiMessage
 */
export function convertProtoToAsiMessage(
	protoMessage: ProtoAsiMessage,
): AppAsiMessage {
	const message: AppAsiMessage = {
		ts: protoMessage.ts,
		type: protoMessage.type === AsiMessageType.ASK ? "ask" : "say",
	};

	// Convert ask enum to string
	if (protoMessage.type === AsiMessageType.ASK) {
		const ask = convertProtoEnumToAsiAsk(protoMessage.ask);
		if (ask !== undefined) {
			message.ask = ask;
		}
	}

	// Convert say enum to string
	if (protoMessage.type === AsiMessageType.SAY) {
		const say = convertProtoEnumToAsiSay(protoMessage.say);
		if (say !== undefined) {
			message.say = say;
		}
	}

	// Convert other fields - preserve empty strings as they may be intentional
	if (protoMessage.text !== "") {
		message.text = protoMessage.text;
	}
	if (protoMessage.reasoning !== "") {
		message.reasoning = protoMessage.reasoning;
	}
	if (protoMessage.images.length > 0) {
		message.images = protoMessage.images;
	}
	if (protoMessage.files.length > 0) {
		message.files = protoMessage.files;
	}
	if (protoMessage.partial) {
		message.partial = protoMessage.partial;
	}
	if (protoMessage.lastCheckpointHash !== "") {
		message.lastCheckpointHash = protoMessage.lastCheckpointHash;
	}
	if (protoMessage.isCheckpointCheckedOut) {
		message.isCheckpointCheckedOut = protoMessage.isCheckpointCheckedOut;
	}
	if (protoMessage.isOperationOutsideWorkspace) {
		message.isOperationOutsideWorkspace =
			protoMessage.isOperationOutsideWorkspace;
	}
	if (protoMessage.conversationHistoryIndex !== 0) {
		message.conversationHistoryIndex = protoMessage.conversationHistoryIndex;
	}

	// Convert conversationHistoryDeletedRange from object to tuple
	if (protoMessage.conversationHistoryDeletedRange) {
		message.conversationHistoryDeletedRange = [
			protoMessage.conversationHistoryDeletedRange.startIndex,
			protoMessage.conversationHistoryDeletedRange.endIndex,
		];
	}

	return message;
}
