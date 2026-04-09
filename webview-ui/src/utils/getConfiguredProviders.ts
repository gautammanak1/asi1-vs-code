import type { ApiConfiguration, ApiProvider } from "@shared/api"
import PROVIDERS from "@shared/providers/providers.json"
import type { RemoteConfigFields } from "@shared/storage/state-keys"

/**
 * Fetch Coder: only ASI:One (`openai`) is supported in the product UI.
 */
export function getConfiguredProviders(
	_remoteConfig: Partial<RemoteConfigFields> | undefined,
	_apiConfiguration: ApiConfiguration | undefined,
): ApiProvider[] {
	return ["openai"]
}

/**
 * Get provider display label from provider value
 * Uses the canonical providers.json as source of truth
 */
export function getProviderLabel(provider: ApiProvider): string {
	const providerEntry = PROVIDERS.list.find((p) => p.value === provider)
	return providerEntry?.label || provider
}
