import { getCheckpointService } from "@core/checkpoint/CheckpointService";
import { String } from "@shared/proto/Asi/common";
import type { FetchCoderRevertFilesRequest } from "@shared/proto/Asi/file";
import type { Controller } from "..";
import { getCheckpointWorkspaceRoot } from "./fetchCoderCheckpointUtils";

export async function revertFetchCoderCheckpointFiles(
	_controller: Controller,
	request: FetchCoderRevertFilesRequest,
): Promise<String> {
	const root = await getCheckpointWorkspaceRoot();
	const svc = getCheckpointService(root);
	const id = request.checkpointId?.trim();
	if (!svc || !id) {
		return String.create({
			value: JSON.stringify({
				success: false,
				restoredFiles: [],
				failedFiles: [],
				errors: ["Invalid request"],
			}),
		});
	}
	const paths = request.paths ?? [];
	const result = await svc.revertFiles(id, paths);
	return String.create({ value: JSON.stringify(result) });
}
