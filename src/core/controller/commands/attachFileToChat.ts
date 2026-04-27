import { sendAddToInputEvent } from "@/core/controller/ui/subscribeToAddToInput";
import { getFileMentionFromPath } from "@/core/mentions";
import { WebviewProvider } from "@/core/webview";
import { VscodeWebviewProvider } from "@/hosts/vscode/VscodeWebviewProvider";
import { Logger } from "@/shared/services/Logger";
import fs from "fs/promises";
import * as vscode from "vscode";

const MAX_FILE_CHARS = 4000;

/**
 * Open a file picker and insert the file path + truncated contents into the chat input.
 */
export async function attachFileToChat(): Promise<void> {
	const uris = await vscode.window.showOpenDialog({
		canSelectFiles: true,
		canSelectFolders: false,
		canSelectMany: false,
		openLabel: "Add to chat",
	});
	if (!uris?.length) {
		return;
	}
	const uri = uris[0]!;
	let text: string;
	try {
		const buf = await fs.readFile(uri.fsPath);
		// Skip obvious binary: let read throw or strip non-utf8
		text = buf.toString("utf8");
	} catch (e) {
		const msg = e instanceof Error ? e.message : String(e);
		vscode.window.showErrorMessage(`Fetch Coder: could not read file — ${msg}`);
		Logger.log(`[attachFileToChat] read failed: ${msg}`);
		return;
	}

	const truncated = text.length > MAX_FILE_CHARS;
	const body = truncated
		? `${text.slice(0, MAX_FILE_CHARS)}\n\n[truncated to ${MAX_FILE_CHARS} characters]`
		: text;
	const mention = await getFileMentionFromPath(uri.fsPath);
	const input = `${mention}\n\`\`\`\n${body}\n\`\`\``;

	const sidebar = WebviewProvider.getInstance() as VscodeWebviewProvider;
	await sidebar.createOrShowWebviewPanel(false);
	await sendAddToInputEvent(input);
}
