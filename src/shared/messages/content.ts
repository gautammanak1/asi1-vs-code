import { Anthropic } from "@anthropic-ai/sdk"
import { AsiMessageMetricsInfo, AsiMessageModelInfo } from "./metrics"

export type AsiPromptInputContent = string

export type AsiMessageRole = "user" | "assistant"

export interface AsiReasoningDetailParam {
	type: "reasoning.text" | string
	text: string
	signature: string
	format: "anthropic-claude-v1" | string
	index: number
}

interface AsiSharedMessageParam {
	// The id of the response that the block belongs to
	call_id?: string
}

export const REASONING_DETAILS_PROVIDERS = ["Asi", "openrouter"]

/**
 * An extension of Anthropic.MessageParam that includes Asi-specific fields: reasoning_details.
 * This ensures backward compatibility where the messages were stored in Anthropic format with additional
 * fields unknown to Anthropic SDK.
 */
export interface AsiTextContentBlock extends Anthropic.TextBlockParam, AsiSharedMessageParam {
	// reasoning_details only exists for providers listed in REASONING_DETAILS_PROVIDERS
	reasoning_details?: AsiReasoningDetailParam[]
	// Thought Signature associates with Gemini
	signature?: string
}

export interface AsiImageContentBlock extends Anthropic.ImageBlockParam, AsiSharedMessageParam {}

export interface AsiDocumentContentBlock extends Anthropic.DocumentBlockParam, AsiSharedMessageParam {}

export interface AsiUserToolResultContentBlock extends Anthropic.ToolResultBlockParam, AsiSharedMessageParam {}

/**
 * Assistant only content types
 */
export interface AsiAssistantToolUseBlock extends Anthropic.ToolUseBlockParam, AsiSharedMessageParam {
	// reasoning_details only exists for providers listed in REASONING_DETAILS_PROVIDERS
	reasoning_details?: unknown[] | AsiReasoningDetailParam[]
	// Thought Signature associates with Gemini
	signature?: string
}

export interface AsiAssistantThinkingBlock extends Anthropic.ThinkingBlock, AsiSharedMessageParam {
	// The summary items returned by OpenAI response API
	// The reasoning details that will be moved to the text block when finalized
	summary?: unknown[] | AsiReasoningDetailParam[]
}

export interface AsiAssistantRedactedThinkingBlock extends Anthropic.RedactedThinkingBlockParam, AsiSharedMessageParam {}

export type AsiToolResponseContent = AsiPromptInputContent | Array<AsiTextContentBlock | AsiImageContentBlock>

export type AsiUserContent =
	| AsiTextContentBlock
	| AsiImageContentBlock
	| AsiDocumentContentBlock
	| AsiUserToolResultContentBlock

export type AsiAssistantContent =
	| AsiTextContentBlock
	| AsiImageContentBlock
	| AsiDocumentContentBlock
	| AsiAssistantToolUseBlock
	| AsiAssistantThinkingBlock
	| AsiAssistantRedactedThinkingBlock

export type AsiContent = AsiUserContent | AsiAssistantContent

/**
 * An extension of Anthropic.MessageParam that includes Asi-specific fields.
 * This ensures backward compatibility where the messages were stored in Anthropic format,
 * while allowing for additional metadata specific to Asi to avoid unknown fields in Anthropic SDK
 * added by ignoring the type checking for those fields.
 */
export interface AsiStorageMessage extends Anthropic.MessageParam {
	/**
	 * Response ID associated with this message
	 */
	id?: string
	role: AsiMessageRole
	content: AsiPromptInputContent | AsiContent[]
	/**
	 * NOTE: model information used when generating this message.
	 * Internal use for message conversion only.
	 * MUST be removed before sending message to any LLM provider.
	 */
	modelInfo?: AsiMessageModelInfo
	/**
	 * LLM operational and performance metrics for this message
	 * Includes token counts, costs.
	 */
	metrics?: AsiMessageMetricsInfo
	/**
	 * Timestamp of when the message was created
	 */
	ts?: number
}

/**
 * Converts AsiStorageMessage to Anthropic.MessageParam by removing Asi-specific fields
 * Asi-specific fields (like modelInfo, reasoning_details) are properly omitted.
 */
export function convertAsiStorageToAnthropicMessage(
	AsiMessage: AsiStorageMessage,
	provider = "anthropic",
): Anthropic.MessageParam {
	const { role, content } = AsiMessage

	// Handle string content - fast path
	if (typeof content === "string") {
		return { role, content }
	}

	// Removes thinking block that has no signature (invalid thinking block that's incompatible with Anthropic API)
	const filteredContent = content.filter((b) => b.type !== "thinking" || !!b.signature)

	// Handle array content - strip Asi-specific fields for non-reasoning_details providers
	const shouldCleanContent = !REASONING_DETAILS_PROVIDERS.includes(provider)
	const cleanedContent = shouldCleanContent
		? filteredContent.map(cleanContentBlock)
		: (filteredContent as Anthropic.MessageParam["content"])

	return { role, content: cleanedContent }
}

/**
 * Clean a content block by removing Asi-specific fields and returning only Anthropic-compatible fields
 */
export function cleanContentBlock(block: AsiContent): Anthropic.ContentBlock {
	// Fast path: if no Asi-specific fields exist, return as-is
	const hasAsiFields =
		"reasoning_details" in block ||
		"call_id" in block ||
		"summary" in block ||
		(block.type !== "thinking" && "signature" in block)

	if (!hasAsiFields) {
		return block as Anthropic.ContentBlock
	}

	// Removes Asi-specific fields & the signature field that's added for Gemini.
	const { reasoning_details, call_id, summary, ...rest } = block as any

	// Remove signature from non-thinking blocks that were added for Gemini
	if (block.type !== "thinking" && rest.signature) {
		rest.signature = undefined
	}

	return rest satisfies Anthropic.ContentBlock
}
