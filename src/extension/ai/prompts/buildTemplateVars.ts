import { getFileMentionFromPath } from "@/core/mentions";
import { singleFileDiagnosticsToProblemsString } from "@/integrations/diagnostics";
import type { CommandContext } from "@/shared/proto/index.Asi";
import type { QuickActionTemplateVars } from "./quickActionTemplates";

export async function buildQuickActionTemplateVars(
	request: CommandContext,
): Promise<QuickActionTemplateVars> {
	const filePath = request.filePath || "";
	const fileMention = await getFileMentionFromPath(filePath);
	const problemsString = await singleFileDiagnosticsToProblemsString(
		filePath,
		request.diagnostics,
	);
	return {
		fileMention,
		language: request.language || "",
		selectedText: request.selectedText || "",
		problemsString,
	};
}
