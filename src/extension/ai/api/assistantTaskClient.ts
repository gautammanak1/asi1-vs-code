import type { Controller } from "@/core/controller";

/**
 * Bridges quick-action prompts to the assistant **task** layer. Streaming and token delivery
 * are handled by {@link Controller} and the webview pipeline — this module only starts or appends tasks.
 */
export async function startNewAssistantTask(
	controller: Controller,
	prompt: string,
): Promise<void> {
	await controller.initTask(prompt);
}

export async function appendToActiveNotebookTask(
	controller: Controller,
	prompt: string,
): Promise<void> {
	if (!controller.task) {
		await startNewAssistantTask(controller, prompt);
		return;
	}
	await controller.task.handleWebviewAskResponse("messageResponse", prompt);
}
