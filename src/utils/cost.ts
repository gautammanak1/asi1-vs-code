import { ModelInfo } from "@shared/api"

/**
 * ASI1 is free — all cost functions return 0.
 * Signatures are preserved so callers don't need changes.
 */

export function calculateApiCostAnthropic(
	_modelInfo: ModelInfo,
	_inputTokens: number,
	_outputTokens: number,
	_cacheCreationInputTokens?: number,
	_cacheReadInputTokens?: number,
	_thinkingBudgetTokens?: number,
): number {
	return 0
}

export function calculateApiCostOpenAI(
	_modelInfo: ModelInfo,
	_inputTokens: number,
	_outputTokens: number,
	_cacheCreationInputTokens?: number,
	_cacheReadInputTokens?: number,
	_thinkingBudgetTokens?: number,
): number {
	return 0
}

export function calculateApiCostQwen(
	_modelInfo: ModelInfo,
	_inputTokens: number,
	_outputTokens: number,
	_cacheCreationInputTokens?: number,
	_cacheReadInputTokens?: number,
	_thinkingBudgetTokens?: number,
): number {
	return 0
}
