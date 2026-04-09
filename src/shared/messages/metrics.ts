import { Mode } from "../storage/types"

export interface AsiMessageModelInfo {
	modelId: string
	providerId: string
	mode: Mode
}

interface AsiTokensInfo {
	prompt: number // Total input tokens (includes cached + non-cached)
	completion: number // Total output tokens
	cached: number // Subset of prompt_tokens that were cache hits
}

export interface AsiMessageMetricsInfo {
	tokens?: AsiTokensInfo
	cost?: number // Monetary cost for this turn
}
