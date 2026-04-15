import { ModelInfo, OpenAiCompatibleModelInfo, openAiModelInfoSaneDefaults } from "@shared/api"
import OpenAI from "openai"
import type { ChatCompletionTool } from "openai/resources/chat/completions"
import { Logger } from "@/shared/services/Logger"
import { AsiStorageMessage } from "@/shared/messages/content"
import { createOpenAIClient } from "@/shared/net"
import { ApiHandler, CommonApiHandlerOptions } from ".."
import { withRetry } from "../retry"
import { convertToOpenAiMessages } from "../transform/openai-format"
import { ApiStream } from "../transform/stream"
import { getOpenAIToolParams, ToolCallProcessor } from "../transform/tool-call-processor"

const ASI_ONE_BASE_URL = "https://api.asi1.ai/v1"
const ASI_ONE_MODEL_DEFAULT = "asi1-mini"

const UNSUPPORTED_ASI1_BODY_KEYS = new Set([
	"logprobs",
	"top_logprobs",
	"n",
	"best_of",
	"logit_bias",
	"suffix",
	"echo",
])

function stripUnsupportedAsi1Params(body: Record<string, unknown>): void {
	for (const key of UNSUPPORTED_ASI1_BODY_KEYS) {
		delete body[key]
	}
}

function formatAsiCompletionError(err: unknown, modelId: string, baseUrl: string): Error {
	if (err instanceof Error && err.message && !(err as { status?: number }).status) {
		return err
	}
	const e = err as {
		status?: number
		message?: string
		error?: { message?: string }
		response?: { text?: () => Promise<string> }
	}
	let detail = e?.message || e?.error?.message || ""
	const status = e?.status
	if (!detail && typeof e?.response?.text === "function") {
		return new Error(
			`ASI:One request failed${status != null ? ` (HTTP ${status})` : ""}. Model: ${modelId}. Check the model name, API key, and that the endpoint supports this request. Endpoint: ${baseUrl}`,
		)
	}
	if (status === 400 && !detail.trim()) {
		return new Error(
			`ASI:One rejected the request (400) with no error details. Check the model name and API key. Model used: ${modelId}. Endpoint: ${baseUrl}`,
		)
	}
	if (!detail.trim()) {
		return new Error(
			`ASI:One request failed${status != null ? ` (HTTP ${status})` : ""}. Model: ${modelId}. Endpoint: ${baseUrl}`,
		)
	}
	return new Error(detail)
}

export interface Asi1ClientOptions extends CommonApiHandlerOptions {
	openAiApiKey?: string
	openAiBaseUrl?: string
	openAiHeaders?: Record<string, string>
	openAiModelId?: string
	openAiModelInfo?: OpenAiCompatibleModelInfo
	reasoningEffort?: string
	webSearchEnabled?: boolean
}

/** ASI:One OpenAI-compatible API handler — the only production LLM client. */
export class Asi1ApiHandler implements ApiHandler {
	private options: Asi1ClientOptions
	private client: OpenAI | undefined

	constructor(options: Asi1ClientOptions) {
		this.options = options
	}

	private ensureClient(): OpenAI {
		if (!this.client) {
			if (!this.options.openAiApiKey) {
				throw new Error(
					"ASI:One API key is required. Please set it in Settings (asiAssistant.apiKey) or via the ASI_ONE_API_KEY environment variable.",
				)
			}
			try {
				this.client = createOpenAIClient({
					baseURL: this.options.openAiBaseUrl || ASI_ONE_BASE_URL,
					apiKey: this.options.openAiApiKey,
					defaultHeaders: this.options.openAiHeaders,
				})
			} catch (error: any) {
				throw new Error(`Error creating ASI:One client: ${error.message}`)
			}
		}
		return this.client
	}

	@withRetry()
	async *createMessage(systemPrompt: string, messages: AsiStorageMessage[], tools?: ChatCompletionTool[]): ApiStream {
		const client = this.ensureClient()
		const baseUrl = this.options.openAiBaseUrl || ASI_ONE_BASE_URL
		const modelId = (this.options.openAiModelId || ASI_ONE_MODEL_DEFAULT).trim()

		const openAiMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
			{ role: "system", content: systemPrompt },
			...convertToOpenAiMessages(messages),
		]
		if (!openAiMessages.some((m) => m.role !== "system")) {
			throw new Error("Missing conversation messages to send to ASI:One.")
		}

		let temperature: number | undefined
		if (this.options.openAiModelInfo?.temperature !== undefined) {
			const tempValue = Number(this.options.openAiModelInfo.temperature)
			temperature = tempValue === 0 ? undefined : tempValue
		} else {
			temperature = openAiModelInfoSaneDefaults.temperature
		}

		let maxTokens: number | undefined
		if (this.options.openAiModelInfo?.maxTokens && this.options.openAiModelInfo.maxTokens > 0) {
			maxTokens = Number(this.options.openAiModelInfo.maxTokens)
		} else {
			maxTokens = undefined
		}

		const createParams: Record<string, unknown> = {
			model: modelId,
			messages: openAiMessages,
			temperature,
			max_tokens: maxTokens,
			stream: true,
			stream_options: { include_usage: true },
			...getOpenAIToolParams(tools),
			...(this.options.webSearchEnabled ? { web_search: true } : {}),
		}
		stripUnsupportedAsi1Params(createParams)

		let stream: AsyncIterable<OpenAI.Chat.ChatCompletionChunk>
		try {
			stream = (await client.chat.completions.create(
				createParams as unknown as OpenAI.Chat.ChatCompletionCreateParamsStreaming,
			)) as AsyncIterable<OpenAI.Chat.ChatCompletionChunk>
		} catch (err) {
			throw formatAsiCompletionError(err, modelId, baseUrl)
		}

		const toolCallProcessor = new ToolCallProcessor()
		let chunkCount = 0
		let yieldedContentChunks = 0

		for await (const chunk of stream) {
			chunkCount++
			const choice = chunk.choices?.[0]
			const delta = choice?.delta

			const content = delta?.content ?? (delta as any)?.message?.content
			if (content) {
				yield {
					type: "text",
					text: content,
				}
				yieldedContentChunks++
			}

			if (delta && "reasoning_content" in delta && delta.reasoning_content) {
				yield {
					type: "reasoning",
					reasoning: (delta.reasoning_content as string | undefined) || "",
				}
				yieldedContentChunks++
			}

			if (delta?.tool_calls) {
				yield* toolCallProcessor.processToolCallDeltas(delta.tool_calls)
				yieldedContentChunks++
			}

			if (choice?.finish_reason && yieldedContentChunks === 0) {
				const fullMessage = (choice as any).message
				if (fullMessage?.content) {
					yield {
						type: "text",
						text: fullMessage.content,
					}
					yieldedContentChunks++
				}
			}

			if (chunk.usage) {
				yield {
					type: "usage",
					inputTokens: chunk.usage.prompt_tokens || 0,
					outputTokens: chunk.usage.completion_tokens || 0,
					cacheReadTokens: chunk.usage.prompt_tokens_details?.cached_tokens || 0,
					// @ts-ignore prompt_cache_miss_tokens is ASI:One-specific
					cacheWriteTokens: chunk.usage.prompt_cache_miss_tokens || 0,
				}
			}
		}

		if (yieldedContentChunks === 0) {
			Logger.warn(`[Asi1ApiHandler] Stream produced no content (${chunkCount} chunks). Falling back to non-streaming request.`)
			const fallbackParams = { ...createParams, stream: false } as Record<string, unknown>
			delete fallbackParams.stream_options
			stripUnsupportedAsi1Params(fallbackParams)
			let fallback: OpenAI.Chat.ChatCompletion
			try {
				fallback = (await client.chat.completions.create(
					fallbackParams as unknown as OpenAI.Chat.ChatCompletionCreateParamsNonStreaming,
				)) as OpenAI.Chat.ChatCompletion
			} catch (err) {
				throw formatAsiCompletionError(err, modelId, baseUrl)
			}
			const fallbackContent = fallback.choices?.[0]?.message?.content
			if (fallbackContent) {
				yield { type: "text", text: fallbackContent }
			}
			if (fallback.usage) {
				yield {
					type: "usage",
					inputTokens: fallback.usage.prompt_tokens || 0,
					outputTokens: fallback.usage.completion_tokens || 0,
				}
			}
		}
	}

	getModel(): { id: string; info: ModelInfo } {
		return {
			id: this.options.openAiModelId || ASI_ONE_MODEL_DEFAULT,
			info: this.options.openAiModelInfo ?? openAiModelInfoSaneDefaults,
		}
	}
}

/** @deprecated Use {@link Asi1ApiHandler} */
export const OpenAiHandler = Asi1ApiHandler
