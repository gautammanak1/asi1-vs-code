// Map providers to model ID / API key fields. Application chat uses ASI:One only (`openai` + optional legacy `Asi`).

import { Secrets, SettingsKey } from "@shared/storage/state-keys"
import { ApiProvider } from "../api"

const ProviderKeyMap: Partial<Record<ApiProvider, string>> = {
	"asi:one": "AsiModelId",
	openai: "OpenAiModelId",
} as const

export const ProviderToApiKeyMap: Partial<Record<ApiProvider, keyof Secrets | (keyof Secrets)[]>> = {
	"asi:one": ["AsiApiKey", "AsiAccountId"],
	openai: "openAiApiKey",
} as const

const ProviderDefaultModelMap: Partial<Record<ApiProvider, string>> = {
	"asi:one": "asi1",
	openai: "asi1",
} as const

/**
 * Get the provider-specific model ID key for a given provider and mode.
 */
export function getProviderModelIdKey(provider: ApiProvider, mode: "act" | "plan"): SettingsKey {
	const keySuffix = ProviderKeyMap[provider]
	if (keySuffix) {
		return `${mode}Mode${keySuffix}` as SettingsKey
	}
	return `${mode}ModeApiModelId`
}

export function getProviderDefaultModelId(provider: ApiProvider): string | null {
	return ProviderDefaultModelMap[provider] || ""
}
