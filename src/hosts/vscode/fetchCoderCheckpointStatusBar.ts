import * as vscode from "vscode";
import { getCheckpointService } from "@core/checkpoint/CheckpointService";
import { setFetchCoderCheckpointStatusHooks } from "@core/checkpoint/checkpointUiBridge";
import { ExtensionRegistryInfo } from "@/registry";

function workspaceRoot(): string | undefined {
	return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
}

export function registerFetchCoderCheckpointStatusBar(
	context: vscode.ExtensionContext,
): void {
	const item = vscode.window.createStatusBarItem(
		vscode.StatusBarAlignment.Right,
		100,
	);
	item.command = ExtensionRegistryInfo.commands.OpenCheckpoints;
	item.tooltip = "Fetch Coder Checkpoints — click to browse";

	let flashTimer: ReturnType<typeof setTimeout> | undefined;
	let revertMode = false;

	const update = async () => {
		if (revertMode) {
			return;
		}
		const root = workspaceRoot();
		const svc = getCheckpointService(root);
		if (!svc) {
			item.text = "$(history) 0 checkpoints";
			item.show();
			return;
		}
		try {
			const { count } = await svc.getStorageInfo();
			item.text = `$(history) ${count} checkpoint${count === 1 ? "" : "s"}`;
		} catch {
			item.text = "$(history) checkpoints";
		}
		item.show();
	};

	const flashSaved = () => {
		if (revertMode) {
			return;
		}
		item.text = "$(save) Checkpoint saved";
		if (flashTimer) {
			clearTimeout(flashTimer);
		}
		flashTimer = setTimeout(() => {
			flashTimer = undefined;
			update().catch(() => {});
		}, 2200);
	};

	const setReverting = (v: boolean) => {
		revertMode = v;
		if (v) {
			if (flashTimer) {
				clearTimeout(flashTimer);
				flashTimer = undefined;
			}
			item.text = "$(sync~spin) Reverting...";
		} else {
			update().catch(() => {});
		}
		item.show();
	};

	setFetchCoderCheckpointStatusHooks({
		refresh: () => {
			update().catch(() => {});
		},
		flashSaved,
		setReverting,
	});

	context.subscriptions.push(
		item,
		vscode.workspace.onDidChangeWorkspaceFolders(() => {
			update().catch(() => {});
		}),
		new vscode.Disposable(() => {
			if (flashTimer) {
				clearTimeout(flashTimer);
			}
			setFetchCoderCheckpointStatusHooks(null);
		}),
	);

	update().catch(() => {});
}
