import type { OnboardingModel } from "@shared/proto/Asi/state";

/**
 * Onboarding model list (fork: no third‑party model marketing).
 * Prefer the model id you set under Settings → API (default ASI:One `asi1-mini`).
 */
export const Asi_ONBOARDING_MODELS: OnboardingModel[] = [
	{
		group: "free",
		id: "asi1-mini",
		name: "Your API model",
		badge: "",
		score: 0,
		latency: 0,
		info: {
			contextWindow: 128_000,
			supportsImages: false,
			supportsPromptCache: false,
			inputPrice: 0,
			outputPrice: 0,
			tiers: [],
		},
	},
];
