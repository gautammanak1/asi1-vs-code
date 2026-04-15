import { startNewAssistantTask } from "@/extension/ai/api/assistantTaskClient";
import type { EditorContextSnapshot } from "@/extension/ai/context/EditorContextBuilder";
import { maybeAppendFileContextBlock } from "@/extension/ai/context/EditorContextBuilder";
import { buildQuickActionTemplateVars } from "@/extension/ai/prompts/buildTemplateVars";
import { resolveQuickActionPrompt } from "@/extension/ai/prompts/PromptManager";
import { telemetryService } from "@/services/telemetry";
import type { CommandContext, Empty } from "@/shared/proto/index.Asi";
import { Logger } from "@/shared/services/Logger";
import type { Controller } from "../index";

export async function fixWithAsi(
	controller: Controller,
	request: CommandContext,
	editorSnapshot?: EditorContextSnapshot,
): Promise<Empty> {
	const vars = await buildQuickActionTemplateVars(request);
	let prompt = resolveQuickActionPrompt("fix", vars);

	if (editorSnapshot) {
		prompt += maybeAppendFileContextBlock(
			editorSnapshot,
			request.language || "text",
		);
	}

	await startNewAssistantTask(controller, prompt);
	Logger.log(
		"fixWithAsi",
		request.selectedText,
		request.filePath,
		request.language,
		vars.problemsString,
	);

	telemetryService.captureButtonClick(
		"codeAction_fixWithAsi",
		controller.task?.ulid,
	);
	return {};
}

export { fixWithAsi as fixWithCline };
