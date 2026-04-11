import { FetchCoderRevertFilesRequest } from "@shared/proto/Asi/file";
import { FileServiceClient } from "@/services/grpc-client";

export async function revertCheckpointFiles(checkpointId: string, paths: string[]) {
	const res = await FileServiceClient.revertFetchCoderCheckpointFiles(
		FetchCoderRevertFilesRequest.create({ checkpointId, paths }),
	);
	try {
		return JSON.parse(res.value || "{}") as {
			success: boolean;
			restoredFiles: string[];
			failedFiles: string[];
			errors: string[];
		};
	} catch {
		return {
			success: false,
			restoredFiles: [] as string[],
			failedFiles: [] as string[],
			errors: ["Invalid response"],
		};
	}
}
