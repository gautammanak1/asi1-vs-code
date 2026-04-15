import { ModelFamily } from "@/shared/prompts"
import { Logger } from "@/shared/services/Logger"
import { AsiDefaultTool } from "@/shared/tools"
import { SystemPromptSection } from "../../templates/placeholders"
import { createVariant } from "../variant-builder"
import { validateVariant } from "../variant-validator"
import { baseTemplate } from "./template"

export const config = createVariant(ModelFamily.ASI1)
	.description("ASI:One — single system prompt for all chat (OpenAI-compatible API).")
	.version(1)
	.tags("asi1", "stable")
	.labels({
		stable: 1,
		production: 1,
	})
	.matcher(() => true)
	.template(baseTemplate)
	.components(
		SystemPromptSection.AGENT_ROLE,
		SystemPromptSection.TOOL_USE,
		SystemPromptSection.TASK_PROGRESS,
		SystemPromptSection.MCP,
		SystemPromptSection.EDITING_FILES,
		SystemPromptSection.ACT_VS_PLAN,
		SystemPromptSection.CAPABILITIES,
		SystemPromptSection.RULES,
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
		MODEL_FAMILY: "asi1",
	})
	.config({})
	.build()

// Compile-time validation
const validationResult = validateVariant({ ...config, id: "asi1" }, { strict: true })
if (!validationResult.isValid) {
	Logger.error("ASI:One variant configuration validation failed:", validationResult.errors)
	throw new Error(`Invalid ASI:One variant configuration: ${validationResult.errors.join(", ")}`)
}

if (validationResult.warnings.length > 0) {
	Logger.warn("ASI:One variant configuration warnings:", validationResult.warnings)
}

// Export type information for better IDE support
export type GenericVariantConfig = typeof config
