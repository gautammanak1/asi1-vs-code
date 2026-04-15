import { ApiHandlerModel, ApiProviderInfo } from "@core/api"

export { supportsReasoningEffortForModel } from "@shared/utils/reasoning-support"

/** Kept for OpenRouter / model-info defaults; ASI:One path does not rely on Gemini Flash caps. */
export const GEMINI_FLASH_MAX_OUTPUT_TOKENS = 8_192

/** True for ASI:One chat models (default `asi1-mini`, hosted IDs containing `asi1`). */
export function isAsi1Model(modelId: string): boolean {
	const id = normalize(modelId)
	return id.includes("asi1")
}

export function isNextGenModelProvider(providerInfo: ApiProviderInfo): boolean {
	const providerId = normalize(providerInfo.providerId)
	return ["Asi", "openai", "openai-compatible"].includes(providerId)
}

export function modelDoesntSupportWebp(_apiHandlerModel: ApiHandlerModel): boolean {
	return false
}

export function shouldSkipReasoningForModel(_modelId?: string): boolean {
	return false
}

export function isLocalModel(providerInfo: ApiProviderInfo): boolean {
	const localProviders = ["lmstudio", "ollama"]
	return localProviders.includes(normalize(providerInfo.providerId))
}

/**
 * Parses a price string and converts it from per-token to per-million-tokens
 * @param priceString The price string to parse (e.g. from API responses)
 * @returns The price multiplied by 1,000,000 for per-million-token pricing, or 0 if invalid
 */
export function parsePrice(priceString: string | undefined): number {
	if (!priceString || priceString === "" || priceString === "0") {
		return 0
	}
	const parsed = Number.parseFloat(priceString)
	if (Number.isNaN(parsed)) {
		return 0
	}
	return parsed * 1_000_000
}

/**
 * Whether the current provider/model uses native tool calling when the user enables it.
 */
export function isNativeToolCallingConfig(providerInfo: ApiProviderInfo, enableNativeToolCalls: boolean): boolean {
	if (!enableNativeToolCalls) {
		return false
	}
	if (!isNextGenModelProvider(providerInfo)) {
		return false
	}
	return isAsi1Model(providerInfo.model.id)
}

/**
 * Parallel tool calling when enabled in settings, or when native tools are active for ASI:One.
 */
export function isParallelToolCallingEnabled(enableParallelSetting: boolean, providerInfo: ApiProviderInfo): boolean {
	if (enableParallelSetting) {
		return true
	}
	return isNativeToolCallingConfig(providerInfo, true)
}

/** OpenRouter / refresh helpers — not used for ASI:One-only flows. */
export function isGeminiFlashModel(_id: string): boolean {
	return false
}

function normalize(text: string): string {
	return text.trim().toLowerCase()
}
