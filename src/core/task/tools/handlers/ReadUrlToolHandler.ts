import type { ToolUse } from "@core/assistant-message"
import { formatResponse } from "@core/prompts/responses"
import { AsiAsk, AsiSayTool } from "@shared/ExtensionMessage"
import { featureFlagsService } from "@/services/feature-flags"
import { telemetryService } from "@/services/telemetry"
import { AsiDefaultTool } from "@/shared/tools"
import type { ToolResponse } from "../../index"
import { showNotificationForApproval } from "../../utils"
import type { IFullyManagedTool } from "../ToolExecutorCoordinator"
import type { TaskConfig } from "../types/TaskConfig"
import type { StronglyTypedUIHelpers } from "../types/UIHelpers"
import { fetchUrlContentAsMarkdown } from "../utils/fetchUrlContent"
import { ToolResultUtils } from "../utils/ToolResultUtils"

export class ReadUrlToolHandler implements IFullyManagedTool {
	readonly name = AsiDefaultTool.READ_URL

	getDescription(block: ToolUse): string {
		return `[${block.name} '${block.params.url}']`
	}

	async handlePartialBlock(block: ToolUse, uiHelpers: StronglyTypedUIHelpers): Promise<void> {
		const url = block.params.url || ""
		const sharedMessageProps: AsiSayTool = {
			tool: "readUrl",
			path: uiHelpers.removeClosingTag(block, "url", url),
			content: `Reading URL: ${uiHelpers.removeClosingTag(block, "url", url)}`,
			operationIsLocatedInWorkspace: false,
		}
		const partialMessage = JSON.stringify(sharedMessageProps)
		await uiHelpers.removeLastPartialMessageIfExistsWithType("say", "tool")
		await uiHelpers.ask("tool" as AsiAsk, partialMessage, block.partial).catch(() => {})
	}

	async execute(config: TaskConfig, block: ToolUse): Promise<ToolResponse> {
		const url: string | undefined = block.params.url

		const apiConfig = config.services.stateManager.getApiConfiguration()
		const currentMode = config.services.stateManager.getGlobalSettingsKey("mode")
		const provider = (currentMode === "plan" ? apiConfig.planModeApiProvider : apiConfig.actModeApiProvider) as string

		const userOff = config.services.stateManager.getGlobalSettingsKey("AsiWebToolsEnabled") === false
		const featureOk = featureFlagsService.getWebtoolsEnabled()
		if (userOff || !featureOk) {
			return formatResponse.toolError("URL reading is disabled in Settings (web tools off).")
		}

		if (!url) {
			config.taskState.consecutiveMistakeCount++
			return await config.callbacks.sayAndCreateMissingParamError(this.name, "url")
		}
		config.taskState.consecutiveMistakeCount = 0

		const sharedMessageProps: AsiSayTool = {
			tool: "readUrl",
			path: url,
			content: `Reading URL: ${url}`,
			operationIsLocatedInWorkspace: false,
		}
		const completeMessage = JSON.stringify(sharedMessageProps)

		if (config.callbacks.shouldAutoApproveTool(this.name)) {
			await config.callbacks.removeLastPartialMessageIfExistsWithType("ask", "tool")
			await config.callbacks.say("tool", completeMessage, undefined, undefined, false)
			telemetryService.captureToolUsage(
				config.ulid,
				"read_url",
				config.api.getModel().id,
				provider,
				true,
				true,
				undefined,
				block.isNativeToolCall,
			)
		} else {
			showNotificationForApproval(
				`Fetch Coder wants to read ${url}`,
				config.autoApprovalSettings.enableNotifications,
			)
			await config.callbacks.removeLastPartialMessageIfExistsWithType("say", "tool")
			const didApprove = await ToolResultUtils.askApprovalAndPushFeedback("tool", completeMessage, config)
			if (!didApprove) {
				return formatResponse.toolDenied()
			}
		}

		try {
			const md = await fetchUrlContentAsMarkdown(url)
			return formatResponse.toolResult(md)
		} catch (error) {
			return `Error reading URL: ${(error as Error).message}`
		}
	}
}
