import * as vscode from "vscode";
import {
  resolveWorkspacePath,
  requireWorkspaceRoot,
  isPathSafe,
} from "./safePath";
import {
  fileHistory,
  captureFileContent,
  createBatchId,
  type EditRecord,
  type EditBatch,
} from "./fileHistory";
import { showDiffPreview, showBatchPreview, selectFilesToApply } from "./diffPreview";
import { flashChangedLines } from "./liveDecorations";

export interface WriteFileRequest {
  relativePath: string;
  content: string;
}

export interface RenameRequest {
  fromPath: string;
  toPath: string;
}

export async function readWorkspaceFile(relativePath: string): Promise<string> {
  const { uri } = resolveWorkspacePath(relativePath);
  const bytes = await vscode.workspace.fs.readFile(uri);
  return new TextDecoder("utf-8", { fatal: false }).decode(bytes);
}

export async function readDirectoryRecursive(
  relativePath: string,
  maxDepth = 5,
  maxFiles = 500
): Promise<string[]> {
  const root = requireWorkspaceRoot();
  const results: string[] = [];

  async function walk(dir: string, depth: number): Promise<void> {
    if (depth > maxDepth || results.length >= maxFiles) return;
    const dirUri = vscode.Uri.joinPath(root, dir);
    let entries: [string, vscode.FileType][];
    try {
      entries = await vscode.workspace.fs.readDirectory(dirUri);
    } catch {
      return;
    }
    for (const [name, type] of entries) {
      if (results.length >= maxFiles) break;
      const childPath = dir ? `${dir}/${name}` : name;
      if (type === vscode.FileType.Directory) {
        if (name === "node_modules" || name === ".git" || name === ".next" || name === "dist" || name === "out") continue;
        await walk(childPath, depth + 1);
      } else if (type === vscode.FileType.File) {
        results.push(childPath);
      }
    }
  }

  await walk(relativePath || ".", 0);
  return results;
}

export async function createDirectory(relativePath: string): Promise<void> {
  const { uri } = resolveWorkspacePath(relativePath);
  await vscode.workspace.fs.createDirectory(uri);
}

export async function ensureParentDirectories(
  relativePath: string
): Promise<void> {
  const segments = relativePath.split("/").filter(Boolean);
  if (segments.length <= 1) return;

  const root = requireWorkspaceRoot();
  const parentSegments = segments.slice(0, -1);
  const parentUri = vscode.Uri.joinPath(root, ...parentSegments);
  await vscode.workspace.fs.createDirectory(parentUri);
}

export async function fileExists(relativePath: string): Promise<boolean> {
  try {
    const { uri } = resolveWorkspacePath(relativePath);
    await vscode.workspace.fs.stat(uri);
    return true;
  } catch {
    return false;
  }
}

/**
 * Write a single file with diff preview and history tracking.
 */
export async function writeFileWithPreview(
  request: WriteFileRequest,
  skipPreview = false
): Promise<boolean> {
  const root = requireWorkspaceRoot();
  const { uri, rel } = resolveWorkspacePath(request.relativePath);

  const exists = await fileExists(rel);
  const originalContent = exists
    ? await captureFileContent(root, rel)
    : "";

  if (!skipPreview) {
    await showDiffPreview(rel, originalContent, request.content);

    const choice = await vscode.window.showInformationMessage(
      `Apply changes to "${rel}"?`,
      "Accept",
      "Reject"
    );
    if (choice !== "Accept") {
      vscode.window.showInformationMessage("Changes rejected.");
      return false;
    }
  }

  fileHistory.saveSnapshot(rel, originalContent);
  await ensureParentDirectories(rel);

  const bytes = new TextEncoder().encode(request.content);
  await vscode.workspace.fs.writeFile(uri, bytes);

  const record: EditRecord = {
    id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`,
    relativePath: rel,
    originalContent,
    newContent: request.content,
    status: exists ? "modified" : "new",
    timestamp: Date.now(),
    applied: true,
  };

  const batch: EditBatch = {
    batchId: createBatchId(),
    records: [record],
    timestamp: Date.now(),
    description: `${exists ? "Modified" : "Created"} ${rel}`,
  };
  fileHistory.addBatch(batch);

  const doc = await vscode.workspace.openTextDocument(uri);
  const editor = await vscode.window.showTextDocument(doc, {
    preview: false,
  });
  flashChangedLines(editor, originalContent, request.content);

  return true;
}

/**
 * Write multiple files with batch preview.
 */
export async function writeFilesWithPreview(
  requests: WriteFileRequest[],
  description?: string
): Promise<boolean> {
  if (!requests.length) return false;

  const root = requireWorkspaceRoot();
  const records: EditRecord[] = [];

  for (const req of requests) {
    if (!isPathSafe(req.relativePath)) {
      vscode.window.showErrorMessage(
        `Unsafe path rejected: ${req.relativePath}`
      );
      continue;
    }

    const exists = await fileExists(req.relativePath);
    const originalContent = exists
      ? await captureFileContent(root, req.relativePath)
      : "";

    records.push({
      id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`,
      relativePath: req.relativePath,
      originalContent,
      newContent: req.content,
      status: exists ? "modified" : "new",
      timestamp: Date.now(),
      applied: false,
    });
  }

  if (!records.length) return false;

  const batch: EditBatch = {
    batchId: createBatchId(),
    records,
    timestamp: Date.now(),
    description: description ?? `Edit ${records.length} file(s)`,
  };

  const decision = await showBatchPreview(batch);

  let toApply: EditRecord[];
  if (decision === "apply") {
    toApply = records;
  } else if (decision === "apply-selected") {
    toApply = await selectFilesToApply(records);
  } else {
    vscode.window.showInformationMessage("All changes rejected.");
    return false;
  }

  if (!toApply.length) {
    vscode.window.showInformationMessage("No files selected.");
    return false;
  }

  for (const record of toApply) {
    fileHistory.saveSnapshot(record.relativePath, record.originalContent);
    await ensureParentDirectories(record.relativePath);

    const { uri } = resolveWorkspacePath(record.relativePath);
    const bytes = new TextEncoder().encode(record.newContent);
    await vscode.workspace.fs.writeFile(uri, bytes);
    record.applied = true;

    const doc = await vscode.workspace.openTextDocument(uri);
    const editor = await vscode.window.showTextDocument(doc, {
      preview: false,
      preserveFocus: true,
    });
    flashChangedLines(editor, record.originalContent, record.newContent);
  }

  fileHistory.addBatch(batch);
  vscode.window.showInformationMessage(
    `Applied ${toApply.length} of ${records.length} file(s).`
  );

  return true;
}

export async function deleteFileWithConfirmation(
  relativePath: string
): Promise<boolean> {
  const root = requireWorkspaceRoot();
  const { uri, rel } = resolveWorkspacePath(relativePath);

  const exists = await fileExists(rel);
  if (!exists) {
    vscode.window.showWarningMessage(`File "${rel}" does not exist.`);
    return false;
  }

  const confirm = await vscode.window.showWarningMessage(
    `Are you sure you want to delete "${rel}"?`,
    { modal: true },
    "Delete"
  );
  if (confirm !== "Delete") return false;

  const content = await captureFileContent(root, rel);
  fileHistory.saveSnapshot(rel, content);

  await vscode.workspace.fs.delete(uri);

  const record: EditRecord = {
    id: `${Date.now().toString(36)}`,
    relativePath: rel,
    originalContent: content,
    newContent: "",
    status: "deleted",
    timestamp: Date.now(),
    applied: true,
  };
  fileHistory.addBatch({
    batchId: createBatchId(),
    records: [record],
    timestamp: Date.now(),
    description: `Deleted ${rel}`,
  });

  vscode.window.showInformationMessage(`Deleted "${rel}".`);
  return true;
}

export async function renameFileWithConfirmation(
  fromPath: string,
  toPath: string
): Promise<boolean> {
  const root = requireWorkspaceRoot();
  const from = resolveWorkspacePath(fromPath);
  const to = resolveWorkspacePath(toPath);

  const exists = await fileExists(from.rel);
  if (!exists) {
    vscode.window.showWarningMessage(`File "${from.rel}" does not exist.`);
    return false;
  }

  const confirm = await vscode.window.showInformationMessage(
    `Rename "${from.rel}" → "${to.rel}"?`,
    "Rename",
    "Cancel"
  );
  if (confirm !== "Rename") return false;

  const content = await captureFileContent(root, from.rel);
  fileHistory.saveSnapshot(from.rel, content);

  await ensureParentDirectories(to.rel);
  await vscode.workspace.fs.rename(from.uri, to.uri, {
    overwrite: false,
  });

  const record: EditRecord = {
    id: `${Date.now().toString(36)}`,
    relativePath: to.rel,
    originalContent: content,
    newContent: content,
    status: "renamed",
    timestamp: Date.now(),
    applied: true,
    renamedFrom: from.rel,
  };
  fileHistory.addBatch({
    batchId: createBatchId(),
    records: [record],
    timestamp: Date.now(),
    description: `Renamed ${from.rel} → ${to.rel}`,
  });

  vscode.window.showInformationMessage(
    `Renamed "${from.rel}" → "${to.rel}".`
  );
  return true;
}
