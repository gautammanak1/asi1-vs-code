import * as vscode from "vscode";

export interface FileSnapshot {
  relativePath: string;
  content: string;
  timestamp: number;
}

export interface EditRecord {
  id: string;
  relativePath: string;
  originalContent: string;
  newContent: string;
  status: "new" | "modified" | "deleted" | "renamed";
  timestamp: number;
  applied: boolean;
  renamedFrom?: string;
}

export interface EditBatch {
  batchId: string;
  records: EditRecord[];
  timestamp: number;
  description?: string;
}

const MAX_HISTORY = 50;

class FileHistoryStore {
  private _batches: EditBatch[] = [];
  private _snapshots = new Map<string, FileSnapshot[]>();

  get batches(): readonly EditBatch[] {
    return this._batches;
  }

  saveSnapshot(relativePath: string, content: string): void {
    const stack = this._snapshots.get(relativePath) ?? [];
    stack.push({
      relativePath,
      content,
      timestamp: Date.now(),
    });
    if (stack.length > MAX_HISTORY) {
      stack.splice(0, stack.length - MAX_HISTORY);
    }
    this._snapshots.set(relativePath, stack);
  }

  getLatestSnapshot(relativePath: string): FileSnapshot | undefined {
    const stack = this._snapshots.get(relativePath);
    return stack?.[stack.length - 1];
  }

  getAllSnapshots(relativePath: string): readonly FileSnapshot[] {
    return this._snapshots.get(relativePath) ?? [];
  }

  addBatch(batch: EditBatch): void {
    this._batches.push(batch);
    if (this._batches.length > MAX_HISTORY) {
      this._batches.splice(0, this._batches.length - MAX_HISTORY);
    }
  }

  getLastBatch(): EditBatch | undefined {
    return this._batches[this._batches.length - 1];
  }

  getAppliedBatches(): EditBatch[] {
    return this._batches.filter((b) =>
      b.records.some((r) => r.applied)
    );
  }

  markBatchReverted(batchId: string): void {
    const batch = this._batches.find((b) => b.batchId === batchId);
    if (batch) {
      for (const r of batch.records) {
        r.applied = false;
      }
    }
  }

  clear(): void {
    this._batches = [];
    this._snapshots.clear();
  }
}

export const fileHistory = new FileHistoryStore();

export function createBatchId(): string {
  return `batch-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

export async function captureFileContent(
  root: vscode.Uri,
  relativePath: string
): Promise<string> {
  const uri = vscode.Uri.joinPath(root, relativePath);
  try {
    const bytes = await vscode.workspace.fs.readFile(uri);
    return new TextDecoder("utf-8", { fatal: false }).decode(bytes);
  } catch {
    return "";
  }
}
