import { DiffViewProvider } from "@integrations/editor/DiffViewProvider";
import * as path from "path";
import * as vscode from "vscode";
import { DecorationController } from "@/hosts/vscode/DecorationController";
import { NotebookDiffView } from "@/hosts/vscode/NotebookDiffView";
import { Logger } from "@/shared/services/Logger";
import { arePathsEqual } from "@/utils/path";

export const DIFF_VIEW_URI_SCHEME = "Asi-diff";

/**
 * Build a virtual URI for the diff left pane. The path **must** start with `/`
 * so VS Code treats it as a path (not an authority). `Asi-diff:index.html` fails to resolve.
 */
export function createAsiDiffVirtualUri(
	pathSegment: string,
	utf8Content: string,
): vscode.Uri {
	let p = pathSegment.replace(/\\/g, "/").trim();
	if (!p.startsWith("/")) {
		p = `/${p}`;
	}
	p = p.replace(/\/{2,}/g, "/");
	return vscode.Uri.from({
		scheme: DIFF_VIEW_URI_SCHEME,
		path: p,
		query: Buffer.from(utf8Content ?? "").toString("base64"),
	});
}

export class VscodeDiffViewProvider extends DiffViewProvider {
	private activeDiffEditor?: vscode.TextEditor;

	private fadedOverlayController?: DecorationController;
	private activeLineController?: DecorationController;
	private notebookDiffView?: NotebookDiffView;

	override async openDiffEditor(): Promise<void> {
		if (!this.absolutePath) {
			throw new Error("No file path set");
		}

		// if the file was already open, close it (must happen after showing the diff view since if it's the only tab the column will close)
		this.documentWasOpen = false;
		// close the tab if it's open (it's already been saved)
		const tabs = vscode.window.tabGroups.all
			.flatMap((tg) => tg.tabs)
			.filter(
				(tab) =>
					tab.input instanceof vscode.TabInputText &&
					arePathsEqual(tab.input.uri.fsPath, this.absolutePath),
			);
		for (const tab of tabs) {
			if (!tab.isDirty) {
				try {
					await vscode.window.tabGroups.close(tab);
				} catch (error) {
					Logger.warn("Tab close retry failed:", error.message);
				}
			}
			this.documentWasOpen = true;
		}

		const uri = vscode.Uri.file(this.absolutePath);
		// If this diff editor is already open (ie if a previous write file was interrupted) then we should activate that instead of opening a new diff
		const diffTab = vscode.window.tabGroups.all
			.flatMap((group) => group.tabs)
			.find(
				(tab) =>
					tab.input instanceof vscode.TabInputTextDiff &&
					tab.input?.original?.scheme === DIFF_VIEW_URI_SCHEME &&
					arePathsEqual(tab.input.modified.fsPath, uri.fsPath),
			);

		if (diffTab && diffTab.input instanceof vscode.TabInputTextDiff) {
			// Use already open diff editor.
			this.activeDiffEditor = await vscode.window.showTextDocument(
				diffTab.input.modified,
				{
					preserveFocus: true,
				},
			);
		} else {
			// Open new diff editor — virtual URI must use `path: /...` (see createAsiDiffVirtualUri).
			const fileName = path.basename(uri.fsPath);
			const pathKey = (this.relPath || fileName).replace(/\\/g, "/");
			const originalVirtualUri = createAsiDiffVirtualUri(
				pathKey,
				this.originalContent ?? "",
			);
			const fileExists = this.editType === "modify";
			const title = `${fileName}: ${fileExists ? "Original ↔ Asi's Changes" : "New File"} (Editable)`;

			await vscode.commands.executeCommand(
				"vscode.diff",
				originalVirtualUri,
				uri,
				title,
				{ preserveFocus: true },
			);

			const pickModifiedEditor = (): vscode.TextEditor | undefined =>
				vscode.window.visibleTextEditors.find((e) =>
					arePathsEqual(e.document.uri.fsPath, uri.fsPath),
				);

			let editor = pickModifiedEditor();
			if (!editor) {
				await new Promise((r) => setTimeout(r, 80));
				editor = pickModifiedEditor();
			}
			if (!editor) {
				editor = vscode.window.activeTextEditor;
				if (editor && !arePathsEqual(editor.document.uri.fsPath, uri.fsPath)) {
					editor = undefined;
				}
			}
			if (!editor) {
				throw new Error("Failed to open diff editor, please try again...");
			}
			this.activeDiffEditor = editor;
		}

		this.fadedOverlayController = new DecorationController(
			"fadedOverlay",
			this.activeDiffEditor,
		);
		this.activeLineController = new DecorationController(
			"activeLine",
			this.activeDiffEditor,
		);
		// Apply faded overlay to all lines initially
		this.fadedOverlayController.addLines(
			0,
			this.activeDiffEditor.document.lineCount,
		);
	}

	/**
	 * If the user closed the diff tab while content is still streaming, the stale
	 * `TextEditor` reference throws or points at a closed document. Re-run the
	 * same open logic so streaming can continue instead of failing the tool.
	 */
	private async ensureActiveDiffEditor(): Promise<void> {
		const ed = this.activeDiffEditor;
		if (ed && !ed.document.isClosed) {
			return;
		}
		this.activeDiffEditor = undefined;
		this.fadedOverlayController = undefined;
		this.activeLineController = undefined;
		if (!this.absolutePath) {
			throw new Error(
				"Cannot reopen diff editor: internal file path was lost. Please run the task again.",
			);
		}
		Logger.warn(
			"[VscodeDiffViewProvider] Diff editor was closed mid-edit; reopening diff view",
		);
		await this.openDiffEditor();
	}

	override async replaceText(
		content: string,
		rangeToReplace: { startLine: number; endLine: number },
		currentLine: number | undefined,
	): Promise<void> {
		await this.ensureActiveDiffEditor();
		if (!this.activeDiffEditor || this.activeDiffEditor.document.isClosed) {
			throw new Error(
				"Unable to edit file: the diff editor could not be reopened. Keep the diff tab open while Fetch Coder streams edits, then approve or retry.",
			);
		}

		// Place cursor at the beginning of the diff editor to keep it out of the way of the stream animation
		const beginningOfDocument = new vscode.Position(0, 0);
		this.activeDiffEditor.selection = new vscode.Selection(
			beginningOfDocument,
			beginningOfDocument,
		);

		// Replace the text in the diff editor document.
		const document = this.activeDiffEditor?.document;
		const replacingToEnd = rangeToReplace.endLine >= document.lineCount;
		const edit = new vscode.WorkspaceEdit();
		const range = new vscode.Range(
			rangeToReplace.startLine,
			0,
			rangeToReplace.endLine,
			0,
		);
		edit.replace(document.uri, range, content);
		await vscode.workspace.applyEdit(edit);

		// VS Code can normalize trailing newlines on full-document replacements.
		// Only fix up when replacing to the end to avoid touching untouched content.
		if (replacingToEnd) {
			const desiredTrailingNewlines = countTrailingNewlines(content);
			const actualTrailingNewlines = countTrailingNewlines(document.getText());
			const newlineDelta = desiredTrailingNewlines - actualTrailingNewlines;

			if (newlineDelta > 0) {
				const fixEdit = new vscode.WorkspaceEdit();
				fixEdit.insert(
					document.uri,
					document.lineAt(document.lineCount - 1).range.end,
					"\n".repeat(newlineDelta),
				);
				await vscode.workspace.applyEdit(fixEdit);
			} else if (newlineDelta < 0) {
				const fixEdit = new vscode.WorkspaceEdit();
				const startLine = Math.max(0, document.lineCount + newlineDelta);
				fixEdit.delete(
					document.uri,
					new vscode.Range(startLine, 0, document.lineCount, 0),
				);
				await vscode.workspace.applyEdit(fixEdit);
			}
		}

		if (currentLine !== undefined) {
			// Update decorations for the entire changed section
			this.activeLineController?.setActiveLine(currentLine);
			this.fadedOverlayController?.updateOverlayAfterLine(
				currentLine,
				document.lineCount,
			);
		}
	}

	override async scrollEditorToLine(line: number): Promise<void> {
		if (!this.activeDiffEditor || this.activeDiffEditor.document.isClosed) {
			return;
		}
		const scrollLine = line + 4;
		this.activeDiffEditor.revealRange(
			new vscode.Range(scrollLine, 0, scrollLine, 0),
			vscode.TextEditorRevealType.InCenter,
		);
	}

	override async scrollAnimation(
		startLine: number,
		endLine: number,
	): Promise<void> {
		if (!this.activeDiffEditor || this.activeDiffEditor.document.isClosed) {
			return;
		}
		const totalLines = endLine - startLine;
		const numSteps = 10; // Adjust this number to control animation speed
		const stepSize = Math.max(1, Math.floor(totalLines / numSteps));

		// Create and await the smooth scrolling animation
		for (let line = startLine; line <= endLine; line += stepSize) {
			this.activeDiffEditor.revealRange(
				new vscode.Range(line, 0, line, 0),
				vscode.TextEditorRevealType.InCenter,
			);
			await new Promise((resolve) => setTimeout(resolve, 16)); // ~60fps
		}
	}

	override async truncateDocument(lineNumber: number): Promise<void> {
		if (!this.activeDiffEditor || this.activeDiffEditor.document.isClosed) {
			try {
				await this.ensureActiveDiffEditor();
			} catch {
				return;
			}
		}
		if (!this.activeDiffEditor || this.activeDiffEditor.document.isClosed) {
			return;
		}
		const document = this.activeDiffEditor.document;
		if (lineNumber < document.lineCount) {
			const edit = new vscode.WorkspaceEdit();
			edit.delete(
				document.uri,
				new vscode.Range(lineNumber, 0, document.lineCount, 0),
			);
			await vscode.workspace.applyEdit(edit);
		}
	}

	protected override async onFinalUpdate(): Promise<void> {
		// Clear all decorations at the end of streaming
		this.fadedOverlayController?.clear();
		this.activeLineController?.clear();
	}

	protected override async getDocumentLineCount(): Promise<number> {
		const d = this.activeDiffEditor?.document;
		if (!d || d.isClosed) {
			return 0;
		}
		return d.lineCount;
	}

	protected override async getDocumentText(): Promise<string | undefined> {
		if (
			!this.activeDiffEditor ||
			!this.activeDiffEditor.document ||
			this.activeDiffEditor.document.isClosed
		) {
			return undefined;
		}
		return this.activeDiffEditor.document.getText();
	}

	protected override async saveDocument(): Promise<Boolean> {
		if (!this.activeDiffEditor || this.activeDiffEditor.document.isClosed) {
			return false;
		}
		if (!this.activeDiffEditor.document.isDirty) {
			return false;
		}
		await this.activeDiffEditor.document.save();
		return true;
	}

	protected async closeAllDiffViews(): Promise<void> {
		// Close all the Asi diff views.
		const tabs = vscode.window.tabGroups.all
			.flatMap((tg) => tg.tabs)
			.filter(
				(tab) =>
					tab.input instanceof vscode.TabInputTextDiff &&
					tab.input?.original?.scheme === DIFF_VIEW_URI_SCHEME,
			);
		for (const tab of tabs) {
			// trying to close dirty views results in save popup
			if (!tab.isDirty) {
				try {
					await vscode.window.tabGroups.close(tab);
				} catch (error) {
					Logger.warn("Tab close retry failed:", error.message);
				}
			}
		}
	}

	protected override async resetDiffView(): Promise<void> {
		if (this.notebookDiffView) {
			await this.notebookDiffView.cleanup();
			this.notebookDiffView = undefined;
		}

		this.activeDiffEditor = undefined;
		this.fadedOverlayController = undefined;
		this.activeLineController = undefined;
	}

	protected override async switchToSpecializedEditor(): Promise<void> {
		if (
			!this.isNotebookFile() ||
			!this.activeDiffEditor ||
			!this.absolutePath
		) {
			return;
		}

		try {
			this.notebookDiffView = new NotebookDiffView();
			await this.notebookDiffView.open(
				this.absolutePath,
				this.activeDiffEditor,
			);
		} catch (error) {
			Logger.error("Failed to create notebook diff view:", error);
		}
	}

	override async showFile(absolutePath: string): Promise<void> {
		const uri = vscode.Uri.file(absolutePath);

		if (this.isNotebookFile()) {
			// Open with Jupyter notebook editor if available
			const jupyterExtension =
				vscode.extensions.getExtension("ms-toolsai.jupyter");
			if (jupyterExtension) {
				await vscode.commands.executeCommand(
					"vscode.openWith",
					uri,
					"jupyter-notebook",
				);
				return;
			}
		}

		// Default: open as text
		await vscode.window.showTextDocument(uri, { preview: false });
	}
}

function countTrailingNewlines(text: string): number {
	let count = 0;
	for (let i = text.length - 1; i >= 0 && text[i] === "\n"; i -= 1) {
		count += 1;
	}
	return count;
}
