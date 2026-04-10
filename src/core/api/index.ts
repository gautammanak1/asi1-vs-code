import { ApiConfiguration, ModelInfo } from "@shared/api"
import { Mode } from "@shared/storage/types"
import { AsiStorageMessage } from "@/shared/messages/content"
import { Logger } from "@/shared/services/Logger"
import { AsiTool } from "@/shared/tools"
import { OpenAiHandler } from "./providers/openai"
import { ApiStream, ApiStreamUsageChunk } from "./transform/stream"

export type CommonApiHandlerOptions = {
	onRetryAttempt?: ApiConfiguration["onRetryAttempt"]
}
export interface ApiHandler {
	createMessage(systemPrompt: string, messages: AsiStorageMessage[], tools?: AsiTool[], useResponseApi?: boolean): ApiStream
	getModel(): ApiHandlerModel
	getApiStreamUsage?(): Promise<ApiStreamUsageChunk | undefined>
	abort?(): void
}

export interface ApiHandlerModel {
	id: string
	info: ModelInfo
}

export interface ApiProviderInfo {
	providerId: string
	model: ApiHandlerModel
	mode: Mode
	customPrompt?: string // "compact"
}

export interface SingleCompletionHandler {
	completePrompt(prompt: string): Promise<string>
}

function createHandlerForProvider(
	_apiProvider: string | undefined,
	options: Omit<ApiConfiguration, "apiProvider">,
	mode: Mode,
): ApiHandler {
	return new OpenAiHandler({
		onRetryAttempt: options.onRetryAttempt,
		openAiApiKey: options.openAiApiKey,
		openAiBaseUrl: options.openAiBaseUrl || "https://api.asi1.ai/v1",
		openAiHeaders: options.openAiHeaders,
		openAiModelId: "asi1",
		openAiModelInfo: mode === "plan" ? options.planModeOpenAiModelInfo : options.actModeOpenAiModelInfo,
		reasoningEffort: mode === "plan" ? options.planModeReasoningEffort : options.actModeReasoningEffort,
		webSearchEnabled: options.webSearchEnabled,
	})
}

export function buildApiHandler(configuration: ApiConfiguration, mode: Mode): ApiHandler {
	const { planModeApiProvider, actModeApiProvider, ...options } = configuration

	const apiProvider = mode === "plan" ? planModeApiProvider : actModeApiProvider

	// Validate thinking budget tokens against model's maxTokens to prevent API errors
	// wrapped in a try-catch for safety, but this should never throw
	try {
		const thinkingBudgetTokens = mode === "plan" ? options.planModeThinkingBudgetTokens : options.actModeThinkingBudgetTokens
		if (thinkingBudgetTokens && thinkingBudgetTokens > 0) {
			const handler = createHandlerForProvider(apiProvider, options, mode)

			const modelInfo = handler.getModel().info
			if (modelInfo?.maxTokens && modelInfo.maxTokens > 0 && thinkingBudgetTokens > modelInfo.maxTokens) {
				const clippedValue = modelInfo.maxTokens - 1
				if (mode === "plan") {
					options.planModeThinkingBudgetTokens = clippedValue
				} else {
					options.actModeThinkingBudgetTokens = clippedValue
				}
			} else {
				return handler // don't rebuild unless its necessary
			}
		}
	} catch (error) {
		Logger.error("buildApiHandler error:", error)
	}

	return createHandlerForProvider(apiProvider, options, mode)
}
