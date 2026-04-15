import { ModelFamily } from "@/shared/prompts"
import { AsiDefaultTool } from "@/shared/tools"
import type { AsiToolSpec } from "../spec"

// HACK: Placeholder to act as tool dependency
const generic: AsiToolSpec = {
	variant: ModelFamily.ASI1,
	id: AsiDefaultTool.TODO,
	name: "focus_chain",
	description: "",
	contextRequirements: (context) => context.focusChainSettings?.enabled === true,
}

export const focus_chain_variants = [generic]
