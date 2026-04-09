import { ModelFamily } from "@/shared/prompts"
import { Logger } from "@/shared/services/Logger"
import { AsiDefaultTool } from "@/shared/tools"
import { isHermesModelFamily } from "@/utils/model-utils"
import { SystemPromptSection } from "../../templates/placeholders"
import { createVariant } from "../variant-builder"
import { validateVariant } from "../variant-validator"
import { hermesComponentOverrides } from "./overrides"
import { baseTemplate } from "./template"

export const config = createVariant(ModelFamily.HERMES)
	.description("Prompt optimized for Hermes-4 model with advanced agentic capabilities.")
	.version(1)
	.tags("hermes", "stable")
	.labels({
		stable: 1,
		production: 1,
	})
	.matcher((context) => {
		const modelId = context.providerInfo.model.id
		return isHermesModelFamily(modelId)
	})
	.template(baseTemplate)
	.components(
		SystemPromptSection.AGENT_ROLE,
		SystemPromptSection.TOOL_USE,
		SystemPromptSection.RULES,
		SystemPromptSection.ACT_VS_PLAN,
		SystemPromptSection.CAPABILITIES,
		SystemPromptSection.EDITING_FILES,
		SystemPromptSection.TODO,
		SystemPromptSection.MCP,
		SystemPromptSection.TASK_PROGRESS,
		SystemPromptSection.SYSTEM_INFO,
		SystemPromptSection.OBJECTIVE,
		SystemPromptSection.USER_INSTRUCTIONS,
		SystemPromptSection.SKILLS,
	)
	.tools(
		AsiDefaultTool.BASH,
		AsiDefaultTool.FILE_READ,
		AsiDefaultTool.FILE_NEW,
		AsiDefaultTool.FILE_EDIT,
		AsiDefaultTool.SEARCH,
		AsiDefaultTool.LIST_FILES,
		AsiDefaultTool.LIST_CODE_DEF,
		AsiDefaultTool.BROWSER,
		AsiDefaultTool.MCP_USE,
		AsiDefaultTool.MCP_ACCESS,
		AsiDefaultTool.ASK,
		AsiDefaultTool.ATTEMPT,
		AsiDefaultTool.NEW_TASK,
		AsiDefaultTool.PLAN_MODE,
		AsiDefaultTool.MCP_DOCS,
		AsiDefaultTool.TODO,
		AsiDefaultTool.GENERATE_EXPLANATION,
		AsiDefaultTool.USE_SKILL,
		AsiDefaultTool.USE_SUBAGENTS,
	)
	.placeholders({
		MODEL_FAMILY: "hermes",
	})
	.config({})
	// Apply Hermes-specific component overrides
	.overrideComponent(SystemPromptSection.AGENT_ROLE, hermesComponentOverrides[SystemPromptSection.AGENT_ROLE])
	.overrideComponent(SystemPromptSection.TOOL_USE, hermesComponentOverrides[SystemPromptSection.TOOL_USE])
	.overrideComponent(SystemPromptSection.OBJECTIVE, hermesComponentOverrides[SystemPromptSection.OBJECTIVE])
	.overrideComponent(SystemPromptSection.RULES, hermesComponentOverrides[SystemPromptSection.RULES])
	.overrideComponent(SystemPromptSection.TASK_PROGRESS, hermesComponentOverrides[SystemPromptSection.TASK_PROGRESS])
	.overrideComponent(SystemPromptSection.MCP, hermesComponentOverrides[SystemPromptSection.MCP])
	.build()

// Compile-time validation
const validationResult = validateVariant({ ...config, id: "hermes" }, { strict: true })
if (!validationResult.isValid) {
	Logger.error("Hermes variant configuration validation failed:", validationResult.errors)
	throw new Error(`Invalid Hermes variant configuration: ${validationResult.errors.join(", ")}`)
}

if (validationResult.warnings.length > 0) {
	Logger.warn("Hermes variant configuration warnings:", validationResult.warnings)
}

// Export type information for better IDE support
export type HermesVariantConfig = typeof config
