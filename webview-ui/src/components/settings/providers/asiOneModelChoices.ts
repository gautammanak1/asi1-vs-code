/**
 * ASI:One OpenAI-compatible API — one base URL + API key; `model` selects the hosted model.
 * Keep ids in sync with https://api.asi1.ai product names.
 */
export const ASI_ONE_MODEL_CHOICES = [
	{ id: "asi1-ultra", label: "asi1-ultra" },
	{ id: "asi1", label: "asi1" },
	{ id: "asi1-mini", label: "asi1-mini" },
] as const

export type AsiOneModelChoiceId = (typeof ASI_ONE_MODEL_CHOICES)[number]["id"]

const ALLOWED = new Set<string>(ASI_ONE_MODEL_CHOICES.map((c) => c.id))

export const ASI_ONE_DEFAULT_MODEL_ID: AsiOneModelChoiceId = "asi1"

export function isAllowedAsiOneModelId(id: string | undefined): id is AsiOneModelChoiceId {
	return id != null && ALLOWED.has(id)
}
