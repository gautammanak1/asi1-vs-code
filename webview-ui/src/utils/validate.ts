import type { ApiConfiguration } from "@shared/api";
import { Mode } from "@shared/storage/types";
import { getModeSpecificFields } from "@/components/settings/utils/providerUtils";

/** Fetch Coder / ASI:One — validate API key, endpoint, and model. */
export function validateApiConfiguration(
	currentMode: Mode,
	apiConfiguration?: ApiConfiguration,
): string | undefined {
	if (!apiConfiguration) {
		return undefined;
	}
	const { apiProvider, openAiModelId } = getModeSpecificFields(
		apiConfiguration,
		currentMode,
	);
	if (apiProvider !== "openai" && apiProvider !== undefined) {
		return undefined;
	}
	if (
		!apiConfiguration.openAiBaseUrl ||
		(!apiConfiguration.openAiApiKey && !apiConfiguration.azureIdentity) ||
		!openAiModelId
	) {
		return "You must provide a valid base URL, API key, and model ID.";
	}
	return undefined;
}

export function validateModelId(
	_currentMode: Mode,
	_apiConfiguration?: ApiConfiguration,
	_openRouterModels?: unknown,
	_AsiModels?: unknown,
): string | undefined {
	return undefined;
}
