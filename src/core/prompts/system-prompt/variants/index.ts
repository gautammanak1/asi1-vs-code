/**
 * ASI:One only — a single prompt variant (ModelFamily.ASI1).
 */
export { config as genericConfig, type GenericVariantConfig } from "./generic/config"

import { ModelFamily } from "@/shared/prompts"
import { config as genericConfig } from "./generic/config"

export const VARIANT_CONFIGS = {
	[ModelFamily.ASI1]: genericConfig,
} as const

export type VariantId = keyof typeof VARIANT_CONFIGS

export function getAvailableVariants(): VariantId[] {
	return Object.keys(VARIANT_CONFIGS) as VariantId[]
}

export function isValidVariantId(id: string): id is VariantId {
	return id in VARIANT_CONFIGS
}

export function loadVariantConfig(variantId: VariantId) {
	return VARIANT_CONFIGS[variantId]
}

export function loadAllVariantConfigs() {
	return VARIANT_CONFIGS
}
