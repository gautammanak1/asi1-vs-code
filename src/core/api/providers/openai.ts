import { ModelInfo, OpenAiCompatibleModelInfo, openAiModelInfoSaneDefaults } from "@shared/api"
import OpenAI from "openai"
import type { ChatCompletionTool } from "openai/resources/chat/completions"
import { Logger } from "@/shared/services/Logger"
import { AsiStorageMessage } from "@/shared/messages/content"
import { createOpenAIClient } from "@/shared/net"
import { ApiHandler, CommonApiHandlerOptions } from "../index"
import { withRetry } from "../retry"
import { convertToOpenAiMessages } from "../transform/openai-format"
import { ApiStream } from "../transform/stream"
import { getOpenAIToolParams, ToolCallProcessor } from "../transform/tool-call-processor"

const ASI_ONE_BASE_URL = "https://api.asi1.ai/v1"
const ASI_ONE_MODEL = "asi1"

interface OpenAiHandlerOptions extends CommonApiHandlerOptions {
	openAiApiKey?: string
	openAiBaseUrl?: string
	openAiHeaders?: Record<string, string>
	openAiModelId?: string
	openAiModelInfo?: OpenAiCompatibleModelInfo
	reasoningEffort?: string
	webSearchEnabled?: boolean
}

export class OpenAiHandler implements ApiHandler {
	private options: OpenAiHandlerOptions
	private client: OpenAI | undefined

	constructor(options: OpenAiHandlerOptions) {
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
		const modelId = this.options.openAiModelId || ASI_ONE_MODEL

		const openAiMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
			{ role: "system", content: systemPrompt },
			...convertToOpenAiMessages(messages),
		]

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

		const baseParams = {
			model: modelId,
			messages: openAiMessages,
			temperature,
			max_tokens: maxTokens,
			...getOpenAIToolParams(tools),
			...(this.options.webSearchEnabled ? { web_search: true } : {}),
		}

		const stream = await client.chat.completions.create({
			...baseParams,
			stream: true as const,
			stream_options: { include_usage: true },
		} as any)

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
			Logger.warn(`[OpenAiHandler] Stream produced no content (${chunkCount} chunks). Falling back to non-streaming request.`)
			const fallback = await client.chat.completions.create({
				...baseParams,
				stream: false as const,
			} as any)
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
			id: this.options.openAiModelId || ASI_ONE_MODEL,
			info: this.options.openAiModelInfo ?? openAiModelInfoSaneDefaults,
		}
	}
}
