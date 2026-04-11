import fs from "node:fs/promises";
import * as path from "node:path";
import { getCheckpointService } from "@core/checkpoint/CheckpointService";
import { EmptyRequest, String } from "@shared/proto/Asi/common";
import { fileExistsAtPath } from "@utils/fs";
import type { Controller } from "..";
import {
	getCheckpointWorkspaceRoot,
	lineDiffStats,
} from "./fetchCoderCheckpointUtils";

export async function listFetchCoderCheckpoints(
	_controller: Controller,
	_request: EmptyRequest,
): Promise<String> {
	const root = await getCheckpointWorkspaceRoot();
	const svc = getCheckpointService(root);
	if (!svc || !root) {
		return String.create({ value: "[]" });
	}
	const list = await svc.listCheckpoints();
	const payload = await Promise.all(
		list.map(async (c) => ({
			id: c.id,
			taskId: c.taskId,
			messageId: c.messageId,
			label: c.label,
			createdAt: c.createdAt,
			gitHash: c.gitHash,
			type: c.type,
			description: c.description,
			files: await Promise.all(
				c.files.map(async (f) => {
					const abs = path.join(root, f.filePath);
					let after = "";
					if (await fileExistsAtPath(abs)) {
						try {
							after = await fs.readFile(abs, "utf8");
						} catch {
							after = "";
						}
					}
					const before = f.encoding === "utf8" ? f.content : "";
					const stats = lineDiffStats(before, after);
					return {
						filePath: f.filePath,
						exists: f.exists,
						sizeBytes: f.sizeBytes,
						encoding: f.encoding,
						linesAdded: stats.add,
						linesRemoved: stats.del,
					};
				}),
			),
		})),
	);
	return String.create({ value: JSON.stringify(payload) });
}
