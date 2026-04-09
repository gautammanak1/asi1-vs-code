import { ModelFamily } from "@/shared/prompts"
import { Logger } from "@/shared/services/Logger"
import { AsiDefaultTool } from "@/shared/tools"
import { isGLMModelFamily } from "@/utils/model-utils"
import { SystemPromptSection } from "../../templates/placeholders"
import { createVariant } from "../variant-builder"
import { validateVariant } from "../variant-validator"
import { glmComponentOverrides } from "./overrides"
import { baseTemplate } from "./template"

export const config = createVariant(ModelFamily.GLM)
	.description("Prompt optimized for GLM-4.6 model with advanced agentic capabilities.")
	.version(1)
	.tags("glm", "stable")
	.labels({
		stable: 1,
		production: 1,
	})
	.matcher((context) => {
		return isGLMModelFamily(context.providerInfo.model.id)
	})
	.template(baseTemplate)
	.components(
		SystemPromptSection.AGENT_ROLE,
		SystemPromptSection.TOOL_USE,
		SystemPromptSection.TASK_PROGRESS,
		SystemPromptSection.RULES,
		SystemPromptSection.ACT_VS_PLAN,
		SystemPromptSection.CAPABILITIES,
		SystemPromptSection.EDITING_FILES,
		SystemPromptSection.TODO,
		SystemPromptSection.MCP,
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
		AsiDefaultTool.PLAN_MODE,
		AsiDefaultTool.MCP_DOCS,
		AsiDefaultTool.TODO,
		AsiDefaultTool.GENERATE_EXPLANATION,
		AsiDefaultTool.USE_SKILL,
		AsiDefaultTool.USE_SUBAGENTS,
	)
	.placeholders({
		MODEL_FAMILY: ModelFamily.GLM,
	})
	.config({})
	// Apply GLM-specific component overrides
	.overrideComponent(SystemPromptSection.TOOL_USE, glmComponentOverrides[SystemPromptSection.TOOL_USE])
	.overrideComponent(SystemPromptSection.OBJECTIVE, glmComponentOverrides[SystemPromptSection.OBJECTIVE])
	.overrideComponent(SystemPromptSection.RULES, glmComponentOverrides[SystemPromptSection.RULES])
	.overrideComponent(SystemPromptSection.TASK_PROGRESS, glmComponentOverrides[SystemPromptSection.TASK_PROGRESS])
	.overrideComponent(SystemPromptSection.MCP, glmComponentOverrides[SystemPromptSection.MCP])
	.build()

// Compile-time validation
const validationResult = validateVariant({ ...config, id: "glm" }, { strict: true })
if (!validationResult.isValid) {
	Logger.error("GLM variant configuration validation failed:", validationResult.errors)
	throw new Error(`Invalid GLM variant configuration: ${validationResult.errors.join(", ")}`)
}

if (validationResult.warnings.length > 0) {
	Logger.warn("GLM variant configuration warnings:", validationResult.warnings)
}

// Export type information for better IDE support
export type GLMVariantConfig = typeof config
