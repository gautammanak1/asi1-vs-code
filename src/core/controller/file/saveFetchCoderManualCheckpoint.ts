import { getCheckpointService } from "@core/checkpoint/CheckpointService";
import { StringRequest } from "@shared/proto/Asi/common";
import { String } from "@shared/proto/Asi/common";
import type { Controller } from "..";
import {
	checkpointsToJsonPublic,
	getCheckpointWorkspaceRoot,
} from "./fetchCoderCheckpointUtils";

export async function saveFetchCoderManualCheckpoint(
	_controller: Controller,
	request: StringRequest,
): Promise<String> {
	const root = await getCheckpointWorkspaceRoot();
	const svc = getCheckpointService(root);
	if (!svc) {
		return String.create({ value: "{}" });
	}
	const desc = request.value?.trim() || "Manual checkpoint";
	const cp = await svc.createManualCheckpoint(desc);
	const [one] = JSON.parse(checkpointsToJsonPublic([cp])) as object[];
	return String.create({ value: JSON.stringify(one) });
}
