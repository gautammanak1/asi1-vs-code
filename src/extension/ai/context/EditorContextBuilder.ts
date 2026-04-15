import * as vscode from "vscode";
import type { Controller } from "@/core/controller";
import { getContextForCommand } from "@/hosts/vscode/commandUtils";
import type { CommandContext } from "@/shared/proto/index.Asi";

const CONFIG_SECTION = "fetchCoder";

export type EditorContextSnapshot = {
	commandContext: CommandContext;
	/** 0-based line of the primary cursor in the active editor when available */
	cursorLine: number;
	/** 0-based character offset on the line */
	cursorCharacter: number;
	/** Full document text truncated for LLM safety; only set when editor matches command file */
	fileContentTruncated?: string;
};

/**
 * Builds editor + task controller context for quick actions and optional file-wide context.
 */
export async function buildEditorQuickActionContext(
	range?: vscode.Range,
	vscodeDiagnostics?: vscode.Diagnostic[],
	options?: { preserveEditorFocus?: boolean },
): Promise<
	{ controller: Controller; snapshot: EditorContextSnapshot } | undefined
> {
	const base = await getContextForCommand(range, vscodeDiagnostics, options);
	if (!base) {
		return undefined;
	}

	const editor = vscode.window.activeTextEditor;
	const pos = editor?.selection.active;
	const cursorLine = pos?.line ?? 0;
	const cursorCharacter = pos?.character ?? 0;

	const maxChars =
		vscode.workspace
			.getConfiguration(CONFIG_SECTION)
			.get<number>("contextMaxFileChars") ?? 20_000;

	let fileContentTruncated: string | undefined;
	if (editor && editor.document.uri.fsPath === base.commandContext.filePath) {
		const full = editor.document.getText();
		fileContentTruncated =
			full.length > maxChars
				? `${full.slice(0, maxChars)}\n\n[... truncated ...]`
				: full;
	}

	return {
		controller: base.controller,
		snapshot: {
			commandContext: base.commandContext,
			cursorLine,
			cursorCharacter,
			fileContentTruncated,
		},
	};
}

/**
 * When enabled in settings, appends truncated file context for richer quick actions.
 */
export function maybeAppendFileContextBlock(
	snapshot: EditorContextSnapshot,
	languageId: string,
): string {
	const include = vscode.workspace
		.getConfiguration(CONFIG_SECTION)
		.get<boolean>("quickActionsIncludeFileContext");
	if (!include || !snapshot.fileContentTruncated?.trim()) {
		return "";
	}
	return `

## Current file context (cursor at line ${snapshot.cursorLine + 1}, column ${snapshot.cursorCharacter + 1})
\`\`\`${languageId}
${snapshot.fileContentTruncated}
\`\`\``;
}
