/**
 * Unit tests for fileHistory.ts — edit history and snapshot management.
 * Run with: npx tsx src/fileHistory.test.ts
 *
 * Inlines types and logic to avoid the vscode dependency.
 */

interface FileSnapshot { relativePath: string; content: string; timestamp: number; }
interface EditRecord { id: string; relativePath: string; originalContent: string; newContent: string; status: "new" | "modified" | "deleted" | "renamed"; timestamp: number; applied: boolean; renamedFrom?: string; }
interface EditBatch { batchId: string; records: EditRecord[]; timestamp: number; description?: string; }
const MAX_HISTORY = 50;
class FileHistoryStore {
  private _batches: EditBatch[] = [];
  private _snapshots = new Map<string, FileSnapshot[]>();
  get batches(): readonly EditBatch[] { return this._batches; }
  saveSnapshot(relativePath: string, content: string): void {
    const stack = this._snapshots.get(relativePath) ?? [];
    stack.push({ relativePath, content, timestamp: Date.now() });
    if (stack.length > MAX_HISTORY) stack.splice(0, stack.length - MAX_HISTORY);
    this._snapshots.set(relativePath, stack);
  }
  getLatestSnapshot(relativePath: string): FileSnapshot | undefined { const s = this._snapshots.get(relativePath); return s?.[s.length - 1]; }
  getAllSnapshots(relativePath: string): readonly FileSnapshot[] { return this._snapshots.get(relativePath) ?? []; }
  addBatch(batch: EditBatch): void { this._batches.push(batch); if (this._batches.length > MAX_HISTORY) this._batches.splice(0, this._batches.length - MAX_HISTORY); }
  getLastBatch(): EditBatch | undefined { return this._batches[this._batches.length - 1]; }
  getAppliedBatches(): EditBatch[] { return this._batches.filter(b => b.records.some(r => r.applied)); }
  markBatchReverted(batchId: string): void { const b = this._batches.find(x => x.batchId === batchId); if (b) for (const r of b.records) r.applied = false; }
  clear(): void { this._batches = []; this._snapshots.clear(); }
}
const fileHistory = new FileHistoryStore();
function createBatchId(): string { return `batch-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`; }

let passed = 0;
let failed = 0;

function assert(condition: boolean, msg: string): void {
  if (condition) {
    passed++;
  } else {
    failed++;
    console.error(`  FAIL: ${msg}`);
  }
}

console.log("=== fileHistory tests ===\n");

// Reset
fileHistory.clear();

// Snapshots
console.log("Snapshots:");
fileHistory.saveSnapshot("src/index.ts", "const a = 1;");
fileHistory.saveSnapshot("src/index.ts", "const a = 2;");
assert(fileHistory.getLatestSnapshot("src/index.ts")?.content === "const a = 2;", "latest snapshot");
assert(fileHistory.getAllSnapshots("src/index.ts").length === 2, "all snapshots count");
assert(fileHistory.getLatestSnapshot("nonexistent") === undefined, "missing file snapshot");

// Batches
console.log("\nBatches:");
const record: EditRecord = {
  id: "r1",
  relativePath: "src/app.ts",
  originalContent: "old",
  newContent: "new",
  status: "modified",
  timestamp: Date.now(),
  applied: true,
};
const batch: EditBatch = {
  batchId: createBatchId(),
  records: [record],
  timestamp: Date.now(),
  description: "Test batch",
};
fileHistory.addBatch(batch);
assert(fileHistory.getLastBatch()?.batchId === batch.batchId, "last batch matches");
assert(fileHistory.getAppliedBatches().length === 1, "one applied batch");

// Mark reverted
console.log("\nRevert marking:");
fileHistory.markBatchReverted(batch.batchId);
assert(fileHistory.getLastBatch()?.records[0].applied === false, "record marked not applied");
assert(fileHistory.getAppliedBatches().length === 0, "no applied batches after revert");

// createBatchId uniqueness
console.log("\nBatch ID uniqueness:");
const ids = new Set<string>();
for (let i = 0; i < 100; i++) ids.add(createBatchId());
assert(ids.size === 100, "100 unique batch IDs");

// Clear
console.log("\nClear:");
fileHistory.clear();
assert(fileHistory.batches.length === 0, "batches cleared");
assert(fileHistory.getLatestSnapshot("src/index.ts") === undefined, "snapshots cleared");

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
if (failed > 0) process.exit(1);
