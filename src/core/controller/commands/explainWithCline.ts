import { startNewAssistantTask } from "@/extension/ai/api/assistantTaskClient";
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

export async function explainWithAsi(
	controller: Controller,
	request: CommandContext,
	notebookContext?: string,
	editorSnapshot?: EditorContextSnapshot,
): Promise<Empty> {
	if (!request.selectedText?.trim() && !notebookContext) {
		HostProvider.window.showMessage({
			type: ShowMessageType.INFORMATION,
			message: "Please select some code to explain.",
		});
		return {};
	}

	const vars = await buildQuickActionTemplateVars(request);
	let prompt = resolveQuickActionPrompt("explain", vars);

	if (notebookContext) {
		Logger.log("Adding notebook context to explainWithAsi task");
		prompt += notebookContext;
	}

	if (editorSnapshot) {
		prompt += maybeAppendFileContextBlock(
			editorSnapshot,
			request.language || "text",
		);
	}

	await startNewAssistantTask(controller, prompt);
	telemetryService.captureButtonClick(
		"codeAction_explainCode",
		controller.task?.ulid,
	);

	return {};
}

export { explainWithAsi as explainWithCline };
