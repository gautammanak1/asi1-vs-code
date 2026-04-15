import type { SystemPromptContext } from "@/core/prompts/system-prompt/types"
import { Logger } from "@/shared/services/Logger"
import type { DeepPlanningVariant, DeepPlanningRegistry as IDeepPlanningRegistry } from "./types"
import { createGenericVariant } from "./variants"

/**
 * Singleton registry — only the generic deep-planning variant (ASI:One).
 */
class DeepPlanningRegistry implements IDeepPlanningRegistry {
	private static instance: DeepPlanningRegistry | null = null
	private variants: Map<string, DeepPlanningVariant> = new Map()
	private genericVariant: DeepPlanningVariant

	private constructor() {
		const genericVariant = createGenericVariant()
		this.registerVariant(genericVariant)
		this.genericVariant = genericVariant
	}

	public static getInstance(): DeepPlanningRegistry {
		if (!DeepPlanningRegistry.instance) {
			DeepPlanningRegistry.instance = new DeepPlanningRegistry()
		}
		return DeepPlanningRegistry.instance
	}

	public register(variant: DeepPlanningVariant): void {
		this.registerVariant(variant)
	}

	private registerVariant(variant: DeepPlanningVariant): void {
		this.variants.set(variant.id, variant)
	}

	public get(_context: SystemPromptContext): DeepPlanningVariant {
		try {
			return this.genericVariant
		} catch (error) {
			Logger.warn("Error selecting deep-planning variant, falling back to generic:", error)
			return this.genericVariant
		}
	}

	public getAll(): DeepPlanningVariant[] {
		return Array.from(this.variants.values())
	}
}

export function getDeepPlanningRegistry(): DeepPlanningRegistry {
	return DeepPlanningRegistry.getInstance()
}
