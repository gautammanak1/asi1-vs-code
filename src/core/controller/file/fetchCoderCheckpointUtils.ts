import { diffLines } from "diff";
import { getCwd, getDesktopDir } from "@/utils/path";
import type { Checkpoint } from "@core/checkpoint/CheckpointService";

export async function getCheckpointWorkspaceRoot(): Promise<
	string | undefined
> {
	return getCwd(getDesktopDir());
}

/** Line add/remove counts for checkpoint file rows (vs current disk). */
export function lineDiffStats(
	before: string,
	after: string,
): { add: number; del: number } {
	let add = 0;
	let del = 0;
	for (const part of diffLines(before, after)) {
		if (part.added) {
			add += part.count ?? 0;
		} else if (part.removed) {
			del += part.count ?? 0;
		}
	}
	return { add, del };
}

/** Strip file bodies from checkpoints for list UI */
export function checkpointsToJsonPublic(checkpoints: Checkpoint[]): string {
	const slim = checkpoints.map((c) => ({
		...c,
		files: c.files.map((f) => ({
			filePath: f.filePath,
			exists: f.exists,
			sizeBytes: f.sizeBytes,
			encoding: f.encoding,
		})),
	}));
	return JSON.stringify(slim);
}
