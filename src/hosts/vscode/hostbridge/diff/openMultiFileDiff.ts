import path from "path";
import * as vscode from "vscode";
import {
	OpenMultiFileDiffRequest,
	OpenMultiFileDiffResponse,
} from "@/shared/proto/index.host";
import { getCwd } from "@/utils/path";
import { createAsiDiffVirtualUri } from "../../VscodeDiffViewProvider";

export async function openMultiFileDiff(
	request: OpenMultiFileDiffRequest,
): Promise<OpenMultiFileDiffResponse> {
	const cwd = await getCwd();
	await vscode.commands.executeCommand(
		"vscode.changes",
		request.title,
		request.diffs.map((diff) => {
			const file = vscode.Uri.file(diff.filePath || "");
			const relativePath = path.relative(cwd, diff.filePath || "");
			const left = diff.leftContent ?? "";
			const right = diff.rightContent ?? "";
			return [
				file,
				createAsiDiffVirtualUri(relativePath, left),
				createAsiDiffVirtualUri(relativePath, right),
			];
		}),
	);

	// Hide the bottom panel to give more room for the diff view
	vscode.commands.executeCommand("workbench.action.closePanel");

	return {};
}
