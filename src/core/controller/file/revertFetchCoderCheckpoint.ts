import { getCheckpointService } from "@core/checkpoint/CheckpointService";
import { StringRequest } from "@shared/proto/Asi/common";
import { String } from "@shared/proto/Asi/common";
import type { Controller } from "..";
import { getCheckpointWorkspaceRoot } from "./fetchCoderCheckpointUtils";

export async function revertFetchCoderCheckpoint(
	_controller: Controller,
	request: StringRequest,
): Promise<String> {
	const root = await getCheckpointWorkspaceRoot();
	const svc = getCheckpointService(root);
	if (!svc || !request.value) {
		return String.create({
			value: JSON.stringify({
				success: false,
				restoredFiles: [],
				failedFiles: [],
				errors: ["No workspace"],
			}),
		});
	}
	const result = await svc.revertToCheckpoint(request.value.trim());
	return String.create({ value: JSON.stringify(result) });
}
