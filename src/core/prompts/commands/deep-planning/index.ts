import type { ApiProviderInfo } from "@/core/api"
import type { SystemPromptContext } from "@/core/prompts/system-prompt/types"
import { getDeepPlanningRegistry } from "./registry"

const focusChainIntro: string = `**Task Progress Parameter:**
When creating the new task, you must include a task_progress parameter that breaks down the implementation into trackable steps. This parameter should be included inside the tool call, but not located inside of other content/argument blocks. This should follow the standard Markdown checklist format with "- [ ]" for incomplete items.`

/**
 * Generates the deep-planning slash command response (ASI:One / generic variant only).
 */
export function getDeepPlanningPrompt(
	focusChainSettings?: { enabled: boolean },
	providerInfo?: ApiProviderInfo,
	enableNativeToolCalls?: boolean,
): string {
	const context: SystemPromptContext = {
		providerInfo: providerInfo || ({} as ApiProviderInfo),
		ide: "vscode",
	}

	const registry = getDeepPlanningRegistry()
	const variant = registry.get(context)
	const newTaskInstructions = generateNewTaskInstructions(enableNativeToolCalls ?? false)
	const focusChainParam = focusChainSettings?.enabled ? focusChainIntro : ""

	let template: string = variant.template
	template = template.replace("{{FOCUS_CHAIN_PARAM}}", focusChainParam)
	template = template.replace("{{NEW_TASK_INSTRUCTIONS}}", newTaskInstructions)

	return template
}

function generateNewTaskInstructions(enableNativeToolCalls: boolean): string {
	if (enableNativeToolCalls) {
		return `
**new_task Tool Definition:**

When you are ready to create the implementation task, you must call the new_task tool with the following structure:

\`\`\`json
{
  "name": "new_task",
  "arguments": {
    "context": "Your detailed context here following the 5-point structure..."
  }
}
\`\`\`

The context parameter should include all five sections as described above.`
	}
	return `
**new_task Tool Definition:**

When you are ready to create the implementation task, you must call the new_task tool with the following structure:

\`\`\`xml
<new_task>
<context>Your detailed context here following the 5-point structure...</context>
</new_task>
\`\`\`

The context parameter should include all five sections as described above.`
}

export type { DeepPlanningRegistry, DeepPlanningVariant } from "./types"
