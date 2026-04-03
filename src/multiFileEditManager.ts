import * as vscode from "vscode";

export interface FileEdit {
  relativePath: string;
  originalContent: string;
  newContent: string;
  language: string;
}

interface PendingMultiEdit {
  id: string;
  edits: FileEdit[];
  timestamp: number;
}

let pendingEdits: PendingMultiEdit | undefined;

export function registerMultiFileEditCommands(
  context: vscode.ExtensionContext
): void {
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "asiAssistant.previewMultiFileEdit",
      (edits: FileEdit[]) => previewMultiFileEdit(edits)
    ),
    vscode.commands.registerCommand(
      "asiAssistant.applyMultiFileEdit",
      () => applyPendingEdits()
    ),
    vscode.commands.registerCommand(
      "asiAssistant.discardMultiFileEdit",
      () => discardPendingEdits()
    )
  );
}

export async function applyFileEdits(edits: FileEdit[]): Promise<boolean> {
  const folder = vscode.workspace.workspaceFolders?.[0];
  if (!folder) {
    vscode.window.showErrorMessage("Open a folder to apply edits.");
    return false;
  }

  const wsEdit = new vscode.WorkspaceEdit();
  const created: string[] = [];

  for (const edit of edits) {
    const uri = vscode.Uri.joinPath(folder.uri, edit.relativePath);
    const segments = edit.relativePath.split("/").filter(Boolean);

    if (segments.length > 1) {
      const parentSegments = segments.slice(0, -1);
      const parentUri = vscode.Uri.joinPath(folder.uri, ...parentSegments);
      try {
        await vscode.workspace.fs.stat(parentUri);
      } catch {
        await vscode.workspace.fs.createDirectory(parentUri);
      }
    }

    let exists = false;
    try {
      await vscode.workspace.fs.stat(uri);
      exists = true;
    } catch {
      // file doesn't exist yet
    }

    if (exists) {
      const doc = await vscode.workspace.openTextDocument(uri);
      const fullRange = new vscode.Range(
        0, 0,
        doc.lineCount - 1,
        doc.lineAt(doc.lineCount - 1).text.length
      );
      wsEdit.replace(uri, fullRange, edit.newContent);
    } else {
      wsEdit.createFile(uri, { overwrite: true });
      wsEdit.insert(uri, new vscode.Position(0, 0), edit.newContent);
      created.push(edit.relativePath);
    }
  }

  const success = await vscode.workspace.applyEdit(wsEdit);
  if (success) {
    const msg = created.length
      ? `Applied edits to ${edits.length} file(s) (${created.length} created). Undo with Ctrl+Z/Cmd+Z.`
      : `Applied edits to ${edits.length} file(s). Undo with Ctrl+Z/Cmd+Z.`;
    vscode.window.showInformationMessage(msg);
  } else {
    vscode.window.showErrorMessage("Failed to apply some edits.");
  }

  return success;
}

async function previewMultiFileEdit(edits: FileEdit[]): Promise<void> {
  if (!edits.length) return;

  pendingEdits = {
    id: Date.now().toString(36),
    edits,
    timestamp: Date.now(),
  };

  for (const edit of edits.slice(0, 5)) {
    const folder = vscode.workspace.workspaceFolders?.[0];
    if (!folder) continue;

    const uri = vscode.Uri.joinPath(folder.uri, edit.relativePath);
    let exists = false;
    try {
      await vscode.workspace.fs.stat(uri);
      exists = true;
    } catch { /* new file */ }

    if (exists) {
      const originalUri = uri.with({ scheme: "untitled", path: `${edit.relativePath}.original` });
      const proposedUri = uri.with({ scheme: "untitled", path: `${edit.relativePath}.proposed` });
      await vscode.commands.executeCommand(
        "vscode.diff",
        originalUri,
        proposedUri,
        `${edit.relativePath} (proposed changes)`
      );
    }
  }

  const fileList = edits.map(e => e.relativePath).join(", ");
  const choice = await vscode.window.showInformationMessage(
    `Fetch Coder: ${edits.length} file(s) to edit: ${fileList}`,
    "Apply All",
    "Discard"
  );

  if (choice === "Apply All") {
    await applyPendingEdits();
  } else {
    discardPendingEdits();
  }
}

async function applyPendingEdits(): Promise<void> {
  if (!pendingEdits) {
    vscode.window.showInformationMessage("No pending edits.");
    return;
  }
  const edits = pendingEdits.edits;
  pendingEdits = undefined;
  await applyFileEdits(edits);
}

function discardPendingEdits(): void {
  pendingEdits = undefined;
  vscode.window.showInformationMessage("Edits discarded.");
}

export function extractMultiFileEditsFromResponse(
  response: string,
  workspaceRoot: vscode.Uri
): FileEdit[] {
  const edits: FileEdit[] = [];
  const fenceRegex = /```(\w*)\s*\n([\s\S]*?)```/g;
  let match: RegExpExecArray | null;

  while ((match = fenceRegex.exec(response)) !== null) {
    const lang = match[1] || "text";
    const code = match[2];

    const pathPatterns = [
      /(?:^|\n)\s*(?:File|Path|Save as)[:\s]+[`"']?([\w./-]+\.\w+)[`"']?\s*$/im,
      /(?:^|\n)\s*#\s+([\w./-]+\.\w+)\s*$/m,
      /(?:^|\n)\s*\/\/\s*file:\s*([\w./-]+\.\w+)\s*$/im,
    ];

    const beforeFence = response.slice(
      Math.max(0, match.index - 200),
      match.index
    );
    const afterFence = response.slice(
      match.index + match[0].length,
      match.index + match[0].length + 200
    );
    const context = beforeFence + "\n" + afterFence;

    let filePath: string | undefined;
    for (const pattern of pathPatterns) {
      const pathMatch = context.match(pattern);
      if (pathMatch?.[1]) {
        filePath = pathMatch[1];
        break;
      }
    }

    const firstLine = code.split("\n")[0]?.trim() || "";
    if (!filePath && /^[\w./-]+\.\w+$/.test(firstLine) && !firstLine.includes(" ")) {
      filePath = firstLine;
    }

    if (filePath && !filePath.includes("..") && !filePath.startsWith("/")) {
      edits.push({
        relativePath: filePath,
        originalContent: "",
        newContent: code.trim(),
        language: lang,
      });
    }
  }

  return edits;
}
