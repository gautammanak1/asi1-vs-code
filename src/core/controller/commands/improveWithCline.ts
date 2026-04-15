import {
	appendToActiveNotebookTask,
	startNewAssistantTask,
} from "@/extension/ai/api/assistantTaskClient";
import type { EditorContextSnapshot } from "@/extension/ai/context/EditorContextBuilder";
import { maybeAppendFileContextBlock } from "@/extension/ai/context/EditorContextBuilder";
import { buildQuickActionTemplateVars } from "@/extension/ai/prompts/buildTemplateVars";
import { resolveQuickActionPrompt } from "@/extension/ai/prompts/PromptManager";
import { HostProvider } from "@/hosts/host-provider";
import { telemetryService } from "@/services/telemetry";
import type { CommandContext, Empty } from "@/shared/proto/index.Asi";
import { ShowMessageType } from "@/shared/proto/index.host";
import { Logger } from "@/shared/services/Logger";
import type { Controller } from "../index";

export async function improveWithAsi(
	controller: Controller,
	request: CommandContext,
	notebookContext?: string,
	editorSnapshot?: EditorContextSnapshot,
): Promise<Empty> {
	if (!request.selectedText?.trim() && !notebookContext) {
		Logger.log("❌ No text selected and no notebook context");
		HostProvider.window.showMessage({
			type: ShowMessageType.INFORMATION,
			message: "Please select some code to improve.",
		});
		return {};
	}

	const vars = await buildQuickActionTemplateVars(request);
	const hasSelectedText = request.selectedText?.trim();

	let prompt: string;
	if (hasSelectedText) {
		prompt = resolveQuickActionPrompt("improve", vars);
		if (editorSnapshot) {
			prompt += maybeAppendFileContextBlock(
				editorSnapshot,
				request.language || "text",
			);
		}
	} else {
		prompt = resolveQuickActionPrompt("improveNotebook", vars);
	}

	if (notebookContext) {
		Logger.log("Adding notebook context to improveWithAsi task");
		prompt += `\n${notebookContext}`;
	}

	if (notebookContext && controller.task) {
		await appendToActiveNotebookTask(controller, prompt);
	} else {
		await startNewAssistantTask(controller, prompt);
	}

	telemetryService.captureButtonClick(
		"codeAction_improveCode",
		controller.task?.ulid,
	);

	return {};
}

export { improveWithAsi as improveWithCline };
