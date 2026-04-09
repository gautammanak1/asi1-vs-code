export interface AsiRecommendedModel {
	id: string
	name: string
	description: string
	tags: string[]
}

export interface AsiRecommendedModelsData {
	recommended: AsiRecommendedModel[]
	free: AsiRecommendedModel[]
}

/**
 * Hardcoded fallback shown when upstream recommended models are not enabled or unavailable.
 */
/** No hardcoded third-party model cards; use Settings → API or your configured provider. */
export const Asi_RECOMMENDED_MODELS_FALLBACK: AsiRecommendedModelsData = {
	recommended: [],
	free: [],
}
