import * as path from "node:path";
import { getCheckpointService } from "@core/checkpoint/CheckpointService";
import { Empty, StringRequest } from "@shared/proto/Asi/common";
import * as vscode from "vscode";
import type { Controller } from "..";
import { getCheckpointWorkspaceRoot } from "./fetchCoderCheckpointUtils";

export const FETCH_CODER_CHECKPOINT_SCHEME = "fetch-coder-checkpoint";

/**
 * Opens vscode.diff between checkpoint snapshot and current file on disk.
 */
export async function openFetchCoderCheckpointDiff(
	_controller: Controller,
	request: StringRequest,
): Promise<Empty> {
	let parsed: { checkpointId?: string; filePath?: string };
	try {
		parsed = JSON.parse(request.value || "{}") as {
			checkpointId?: string;
			filePath?: string;
		};
	} catch {
		return Empty.create();
	}
	const checkpointId = parsed.checkpointId?.trim();
	const filePath = parsed.filePath?.trim();
	if (!checkpointId || !filePath) {
		return Empty.create();
	}

	const root = await getCheckpointWorkspaceRoot();
	if (!root) {
		return Empty.create();
	}

	const segments = filePath.split(/[/\\]/).filter(Boolean);
	const before = vscode.Uri.joinPath(
		vscode.Uri.from({
			scheme: FETCH_CODER_CHECKPOINT_SCHEME,
			path: `/${checkpointId}`,
		}),
		...segments,
	);
	const after = vscode.Uri.file(path.join(root, filePath));
	const title = `Checkpoint ↔ ${path.basename(filePath)}`;
	await vscode.commands.executeCommand("vscode.diff", before, after, title);
	return Empty.create();
}
