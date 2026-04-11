import { getCheckpointService } from "@core/checkpoint/CheckpointService";
import { StringRequest } from "@shared/proto/Asi/common";
import { Empty } from "@shared/proto/Asi/common";
import type { Controller } from "..";
import { getCheckpointWorkspaceRoot } from "./fetchCoderCheckpointUtils";

export async function deleteFetchCoderCheckpoint(
	_controller: Controller,
	request: StringRequest,
): Promise<Empty> {
	const root = await getCheckpointWorkspaceRoot();
	const svc = getCheckpointService(root);
	if (svc && request.value) {
		await svc.deleteCheckpoint(request.value.trim());
	}
	return Empty.create();
}
