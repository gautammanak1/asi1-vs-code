import { getCheckpointService } from "@core/checkpoint/CheckpointService";
import { EmptyRequest } from "@shared/proto/Asi/common";
import { String } from "@shared/proto/Asi/common";
import type { Controller } from "..";
import { getCheckpointWorkspaceRoot } from "./fetchCoderCheckpointUtils";

export async function clearFetchCoderCheckpoints(
	_controller: Controller,
	_request: EmptyRequest,
): Promise<String> {
	const root = await getCheckpointWorkspaceRoot();
	const svc = getCheckpointService(root);
	if (!svc) {
		return String.create({ value: JSON.stringify({ deleted: 0 }) });
	}
	const n = await svc.clearAll();
	return String.create({ value: JSON.stringify({ deleted: n }) });
}
