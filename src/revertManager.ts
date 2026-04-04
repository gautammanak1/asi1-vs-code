import * as vscode from "vscode";
import { fileHistory } from "./fileHistory";
import { requireWorkspaceRoot, resolveWorkspacePath } from "./safePath";

export async function revertLastChange(): Promise<boolean> {
  const batch = fileHistory.getLastBatch();
  if (!batch || !batch.records.some((r) => r.applied)) {
    vscode.window.showInformationMessage("No applied changes to revert.");
    return false;
  }
  return revertBatch(batch.batchId);
}

export async function revertBatch(batchId: string): Promise<boolean> {
  const batches = fileHistory.batches;
  const batch = batches.find((b) => b.batchId === batchId);
  if (!batch) {
    vscode.window.showWarningMessage("Batch not found.");
    return false;
  }

  const appliedRecords = batch.records.filter((r) => r.applied);
  if (!appliedRecords.length) {
    vscode.window.showInformationMessage("No applied records in this batch.");
    return false;
  }

  const root = requireWorkspaceRoot();
  let reverted = 0;

  for (const record of appliedRecords) {
    try {
      const { uri } = resolveWorkspacePath(record.relativePath);

      if (record.status === "new") {
        const confirm = await vscode.window.showWarningMessage(
          `Delete newly created file "${record.relativePath}"?`,
          { modal: true },
          "Delete"
        );
        if (confirm === "Delete") {
          await vscode.workspace.fs.delete(uri);
          reverted++;
        }
      } else if (record.status === "deleted") {
        const bytes = new TextEncoder().encode(record.originalContent);
        await vscode.workspace.fs.writeFile(uri, bytes);
        reverted++;
      } else {
        const bytes = new TextEncoder().encode(record.originalContent);
        await vscode.workspace.fs.writeFile(uri, bytes);
        reverted++;
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      vscode.window.showErrorMessage(
        `Failed to revert "${record.relativePath}": ${msg}`
      );
    }
  }

  if (reverted > 0) {
    fileHistory.markBatchReverted(batchId);
    vscode.window.showInformationMessage(
      `Reverted ${reverted} file(s) from batch.`
    );
  }

  return reverted > 0;
}

export async function revertFile(relativePath: string): Promise<boolean> {
  const snapshot = fileHistory.getLatestSnapshot(relativePath);
  if (!snapshot) {
    vscode.window.showInformationMessage(
      `No saved snapshot for "${relativePath}".`
    );
    return false;
  }

  try {
    const { uri } = resolveWorkspacePath(relativePath);
    const bytes = new TextEncoder().encode(snapshot.content);
    await vscode.workspace.fs.writeFile(uri, bytes);
    vscode.window.showInformationMessage(
      `Reverted "${relativePath}" to snapshot from ${new Date(snapshot.timestamp).toLocaleTimeString()}.`
    );
    return true;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    vscode.window.showErrorMessage(`Revert failed: ${msg}`);
    return false;
  }
}

export async function revertAllPending(): Promise<void> {
  const applied = fileHistory.getAppliedBatches();
  if (!applied.length) {
    vscode.window.showInformationMessage("No applied batches to revert.");
    return;
  }

  const confirm = await vscode.window.showWarningMessage(
    `Revert ${applied.length} batch(es) of changes?`,
    { modal: true },
    "Revert All"
  );
  if (confirm !== "Revert All") return;

  for (const batch of [...applied].reverse()) {
    await revertBatch(batch.batchId);
  }
}

export async function showRevertPicker(): Promise<void> {
  const applied = fileHistory.getAppliedBatches();
  if (!applied.length) {
    vscode.window.showInformationMessage("No change history.");
    return;
  }

  const items = applied.map((batch) => ({
    label: batch.description ?? batch.batchId,
    description: `${batch.records.length} file(s)`,
    detail: batch.records.map((r) => r.relativePath).join(", "),
    batchId: batch.batchId,
  }));

  const pick = await vscode.window.showQuickPick(items, {
    title: "Select a batch to revert",
    placeHolder: "Pick a change batch",
  });

  if (pick) {
    await revertBatch(pick.batchId);
  }
}
