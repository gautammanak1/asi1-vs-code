import * as vscode from "vscode";
import { getCheckpointService } from "@core/checkpoint/CheckpointService";
import { FETCH_CODER_CHECKPOINT_SCHEME } from "@core/controller/file/openFetchCoderCheckpointDiff";

export function registerFetchCoderCheckpointDocumentProvider(
	context: vscode.ExtensionContext,
): void {
	const provider = new (class implements vscode.TextDocumentContentProvider {
		provideTextDocumentContent(uri: vscode.Uri): string {
			const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
			if (!root || uri.scheme !== FETCH_CODER_CHECKPOINT_SCHEME) {
				return "";
			}
			const svc = getCheckpointService(root);
			if (!svc) {
				return "";
			}
			let p = uri.path;
			if (p.startsWith("/")) {
				p = p.slice(1);
			}
			const parts = p.split("/").filter(Boolean);
			if (parts.length < 2) {
				return "";
			}
			const checkpointId = parts[0]!;
			const filePath = parts.slice(1).join("/");
			const cp = svc.loadCheckpointSync(checkpointId);
			const snap = cp?.files.find(
				(f) =>
					f.filePath === filePath ||
					f.filePath.replace(/\\/g, "/") === filePath,
			);
			if (!snap || snap.encoding !== "utf8") {
				return "";
			}
			return snap.content;
		}
	})();
	context.subscriptions.push(
		vscode.workspace.registerTextDocumentContentProvider(
			FETCH_CODER_CHECKPOINT_SCHEME,
			provider,
		),
	);
}
