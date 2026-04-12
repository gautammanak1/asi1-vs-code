import type { ApiConfiguration, ApiProvider, ModelInfo } from "@shared/api";
import { openAiModelInfoSaneDefaults } from "@shared/api";
import { Mode } from "@shared/storage/types";
import * as reasoningSupport from "@shared/utils/reasoning-support";

export function supportsReasoningEffortForModelId(
	modelId?: string,
	_allowShortOpenAiIds = false,
): boolean {
	return reasoningSupport.supportsReasoningEffortForModel(modelId);
}

export interface NormalizedApiConfig {
	/** Always ASI:One (`asi1`) in Fetch Coder; kept for call-site compatibility. */
	selectedModelId: string;
	selectedModelInfo: ModelInfo;
}

/** Fetch Coder: no static per-provider catalogs in the UI. */
export function getModelsForProvider(
	_provider: ApiProvider,
	_apiConfiguration?: ApiConfiguration,
	_dynamicModels?: {
		liteLlmModels?: Record<string, ModelInfo>;
		basetenModels?: Record<string, ModelInfo>;
	},
): Record<string, ModelInfo> | undefined {
	return undefined;
}

/**
 * Normalizes API config for the task header / chat chrome. Fork targets ASI:One (`openai` + `asi1`).
 */
export function normalizeApiConfiguration(
	apiConfiguration: ApiConfiguration | undefined,
	currentMode: Mode,
): NormalizedApiConfig {
	const openAiModelId =
		currentMode === "plan"
			? apiConfiguration?.planModeOpenAiModelId
			: apiConfiguration?.actModeOpenAiModelId;
	const openAiModelInfo =
		currentMode === "plan"
			? apiConfiguration?.planModeOpenAiModelInfo
			: apiConfiguration?.actModeOpenAiModelInfo;
	const base = openAiModelInfo || openAiModelInfoSaneDefaults;
	return {
		selectedModelId: openAiModelId || "asi1-mini",
		selectedModelInfo: {
			...base,
			contextWindow: 128_000,
			description: undefined,
		},
	};
}

function pick<C extends ApiConfiguration, K extends keyof C>(
	config: C,
	mode: Mode,
	planKey: K,
	actKey: K,
): C[K] {
	return (mode === "plan" ? config[planKey] : config[actKey]) as C[K];
}

/**
 * Mode-specific API fields (narrow surface for chat chrome, validation, sync).
 */
export function getModeSpecificFields(
	apiConfiguration: ApiConfiguration | undefined,
	mode: Mode,
) {
	if (!apiConfiguration) {
		return {
			apiProvider: undefined as ApiProvider | undefined,
			apiModelId: undefined,
			openAiModelId: undefined,
			openAiModelInfo: undefined,
			openRouterModelId: undefined,
			openRouterModelInfo: undefined,
			AsiModelId: undefined,
			AsiModelInfo: undefined,
			togetherModelId: undefined,
			fireworksModelId: undefined,
			lmStudioModelId: undefined,
			ollamaModelId: undefined,
			liteLlmModelId: undefined,
			liteLlmModelInfo: undefined,
			requestyModelId: undefined,
			requestyModelInfo: undefined,
			groqModelId: undefined,
			groqModelInfo: undefined,
			basetenModelId: undefined,
			basetenModelInfo: undefined,
			huggingFaceModelId: undefined,
			huggingFaceModelInfo: undefined,
			vsCodeLmModelSelector: undefined,
			aihubmixModelId: undefined,
			aihubmixModelInfo: undefined,
			hicapModelId: undefined,
			hicapModelInfo: undefined,
			nousResearchModelId: undefined,
			ocaModelId: undefined,
			ocaModelInfo: undefined,
			huaweiCloudMaasModelId: undefined,
			huaweiCloudMaasModelInfo: undefined,
			awsBedrockCustomSelected: undefined,
			awsBedrockCustomModelBaseId: undefined,
			thinkingBudgetTokens: undefined,
			reasoningEffort: undefined,
		};
	}

	const c = apiConfiguration;
	const openRouterModelId = pick(
		c,
		mode,
		"planModeOpenRouterModelId",
		"actModeOpenRouterModelId",
	);
	const openRouterModelInfo = pick(
		c,
		mode,
		"planModeOpenRouterModelInfo",
		"actModeOpenRouterModelInfo",
	);

	return {
		apiProvider: pick(c, mode, "planModeApiProvider", "actModeApiProvider"),
		apiModelId: pick(c, mode, "planModeApiModelId", "actModeApiModelId"),
		openAiModelId: pick(
			c,
			mode,
			"planModeOpenAiModelId",
			"actModeOpenAiModelId",
		),
		openAiModelInfo: pick(
			c,
			mode,
			"planModeOpenAiModelInfo",
			"actModeOpenAiModelInfo",
		),
		openRouterModelId,
		openRouterModelInfo,
		AsiModelId:
			pick(c, mode, "planModeAsiModelId", "actModeAsiModelId") ||
			openRouterModelId,
		AsiModelInfo:
			pick(c, mode, "planModeAsiModelInfo", "actModeAsiModelInfo") ||
			openRouterModelInfo,
		togetherModelId: pick(
			c,
			mode,
			"planModeTogetherModelId",
			"actModeTogetherModelId",
		),
		fireworksModelId: pick(
			c,
			mode,
			"planModeFireworksModelId",
			"actModeFireworksModelId",
		),
		lmStudioModelId: pick(
			c,
			mode,
			"planModeLmStudioModelId",
			"actModeLmStudioModelId",
		),
		ollamaModelId: pick(
			c,
			mode,
			"planModeOllamaModelId",
			"actModeOllamaModelId",
		),
		liteLlmModelId: pick(
			c,
			mode,
			"planModeLiteLlmModelId",
			"actModeLiteLlmModelId",
		),
		liteLlmModelInfo: pick(
			c,
			mode,
			"planModeLiteLlmModelInfo",
			"actModeLiteLlmModelInfo",
		),
		requestyModelId: pick(
			c,
			mode,
			"planModeRequestyModelId",
			"actModeRequestyModelId",
		),
		requestyModelInfo: pick(
			c,
			mode,
			"planModeRequestyModelInfo",
			"actModeRequestyModelInfo",
		),
		groqModelId: pick(c, mode, "planModeGroqModelId", "actModeGroqModelId"),
		groqModelInfo: pick(
			c,
			mode,
			"planModeGroqModelInfo",
			"actModeGroqModelInfo",
		),
		basetenModelId: pick(
			c,
			mode,
			"planModeBasetenModelId",
			"actModeBasetenModelId",
		),
		basetenModelInfo: pick(
			c,
			mode,
			"planModeBasetenModelInfo",
			"actModeBasetenModelInfo",
		),
		huggingFaceModelId: pick(
			c,
			mode,
			"planModeHuggingFaceModelId",
			"actModeHuggingFaceModelId",
		),
		huggingFaceModelInfo: pick(
			c,
			mode,
			"planModeHuggingFaceModelInfo",
			"actModeHuggingFaceModelInfo",
		),
		vsCodeLmModelSelector: pick(
			c,
			mode,
			"planModeVsCodeLmModelSelector",
			"actModeVsCodeLmModelSelector",
		),
		aihubmixModelId: pick(
			c,
			mode,
			"planModeAihubmixModelId",
			"actModeAihubmixModelId",
		),
		aihubmixModelInfo: pick(
			c,
			mode,
			"planModeAihubmixModelInfo",
			"actModeAihubmixModelInfo",
		),
		hicapModelId: pick(c, mode, "planModeHicapModelId", "actModeHicapModelId"),
		hicapModelInfo: pick(
			c,
			mode,
			"planModeHicapModelInfo",
			"actModeHicapModelInfo",
		),
		nousResearchModelId: pick(
			c,
			mode,
			"planModeNousResearchModelId",
			"actModeNousResearchModelId",
		),
		ocaModelId: pick(c, mode, "planModeOcaModelId", "actModeOcaModelId"),
		ocaModelInfo: pick(c, mode, "planModeOcaModelInfo", "actModeOcaModelInfo"),
		huaweiCloudMaasModelId: pick(
			c,
			mode,
			"planModeHuaweiCloudMaasModelId",
			"actModeHuaweiCloudMaasModelId",
		),
		huaweiCloudMaasModelInfo: pick(
			c,
			mode,
			"planModeHuaweiCloudMaasModelInfo",
			"actModeHuaweiCloudMaasModelInfo",
		),
		awsBedrockCustomSelected: pick(
			c,
			mode,
			"planModeAwsBedrockCustomSelected",
			"actModeAwsBedrockCustomSelected",
		),
		awsBedrockCustomModelBaseId: pick(
			c,
			mode,
			"planModeAwsBedrockCustomModelBaseId",
			"actModeAwsBedrockCustomModelBaseId",
		),
		thinkingBudgetTokens: pick(
			c,
			mode,
			"planModeThinkingBudgetTokens",
			"actModeThinkingBudgetTokens",
		),
		reasoningEffort: pick(
			c,
			mode,
			"planModeReasoningEffort",
			"actModeReasoningEffort",
		),
	};
}

/** When Plan/Act share one profile, copy the active mode’s ASI:One fields to both. */
export async function syncModeConfigurations(
	apiConfiguration: ApiConfiguration | undefined,
	sourceMode: Mode,
	handleFieldsChange: (updates: Partial<ApiConfiguration>) => Promise<void>,
): Promise<void> {
	if (!apiConfiguration) {
		return;
	}
	const sourceFields = getModeSpecificFields(apiConfiguration, sourceMode);
	const updates: Partial<ApiConfiguration> = {
		planModeApiProvider: sourceFields.apiProvider ?? "openai",
		actModeApiProvider: sourceFields.apiProvider ?? "openai",
		planModeThinkingBudgetTokens: sourceFields.thinkingBudgetTokens,
		actModeThinkingBudgetTokens: sourceFields.thinkingBudgetTokens,
		planModeReasoningEffort: sourceFields.reasoningEffort,
		actModeReasoningEffort: sourceFields.reasoningEffort,
		planModeOpenAiModelId: sourceFields.openAiModelId,
		actModeOpenAiModelId: sourceFields.openAiModelId,
		planModeOpenAiModelInfo: sourceFields.openAiModelInfo,
		actModeOpenAiModelInfo: sourceFields.openAiModelInfo,
	};
	await handleFieldsChange(updates);
}

export { filterOpenRouterModelIds } from "@shared/utils/model-filters";
