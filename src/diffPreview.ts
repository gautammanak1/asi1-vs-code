import * as vscode from "vscode";
import type { EditRecord, EditBatch } from "./fileHistory";

const SCHEME_ORIGINAL = "asi-original";
const SCHEME_PROPOSED = "asi-proposed";

const contentStore = new Map<string, string>();

class VirtualDocumentProvider implements vscode.TextDocumentContentProvider {
  private _onDidChange = new vscode.EventEmitter<vscode.Uri>();
  readonly onDidChangeTextDocument = this._onDidChange.event;

  get onDidChange(): vscode.Event<vscode.Uri> {
    return this._onDidChange.event;
  }

  provideTextDocumentContent(uri: vscode.Uri): string {
    return contentStore.get(uri.toString()) ?? "";
  }

  update(uri: vscode.Uri): void {
    this._onDidChange.fire(uri);
  }
}

const originalProvider = new VirtualDocumentProvider();
const proposedProvider = new VirtualDocumentProvider();
let registered = false;

export function registerDiffProviders(
  context: vscode.ExtensionContext
): void {
  if (registered) return;
  registered = true;
  context.subscriptions.push(
    vscode.workspace.registerTextDocumentContentProvider(
      SCHEME_ORIGINAL,
      originalProvider
    ),
    vscode.workspace.registerTextDocumentContentProvider(
      SCHEME_PROPOSED,
      proposedProvider
    )
  );
}

function makeUri(scheme: string, relativePath: string): vscode.Uri {
  return vscode.Uri.parse(
    `${scheme}:/${relativePath.replace(/\\/g, "/")}`
  );
}

export async function showDiffPreview(
  relativePath: string,
  originalContent: string,
  proposedContent: string
): Promise<void> {
  const origUri = makeUri(SCHEME_ORIGINAL, relativePath);
  const propUri = makeUri(SCHEME_PROPOSED, relativePath);

  contentStore.set(origUri.toString(), originalContent);
  contentStore.set(propUri.toString(), proposedContent);

  originalProvider.update(origUri);
  proposedProvider.update(propUri);

  await vscode.commands.executeCommand(
    "vscode.diff",
    origUri,
    propUri,
    `${relativePath} (current ↔ proposed)`
  );
}

export async function showBatchPreview(
  batch: EditBatch
): Promise<"apply" | "apply-selected" | "reject"> {
  for (const record of batch.records.slice(0, 10)) {
    await showDiffPreview(
      record.relativePath,
      record.originalContent,
      record.newContent
    );
  }

  const statusLabels = batch.records.map((r) => {
    const icon =
      r.status === "new"
        ? "$(new-file)"
        : r.status === "deleted"
          ? "$(trash)"
          : r.status === "renamed"
            ? "$(arrow-swap)"
            : "$(diff-modified)";
    return `${icon} ${r.relativePath}`;
  });

  const items: vscode.QuickPickItem[] = [
    {
      label: "$(check-all) Apply All",
      description: `${batch.records.length} file(s)`,
      detail: statusLabels.join("  ·  "),
    },
    {
      label: "$(checklist) Select Files…",
      description: "Choose which files to apply",
    },
    {
      label: "$(close) Reject All",
      description: "Discard all proposed changes",
    },
  ];

  const pick = await vscode.window.showQuickPick(items, {
    title: "Fetch Coder: Review Workspace Changes",
    placeHolder: "Choose how to handle proposed changes",
  });

  if (!pick) return "reject";

  if (pick.label.includes("Apply All")) return "apply";
  if (pick.label.includes("Select Files")) return "apply-selected";
  return "reject";
}

export async function selectFilesToApply(
  records: EditRecord[]
): Promise<EditRecord[]> {
  const items: (vscode.QuickPickItem & { record: EditRecord })[] =
    records.map((r) => ({
      label: r.relativePath,
      description: r.status.toUpperCase(),
      picked: true,
      record: r,
    }));

  const selected = await vscode.window.showQuickPick(items, {
    canPickMany: true,
    title: "Select files to apply",
    placeHolder: "Check files you want to write",
  });

  return selected?.map((s) => s.record) ?? [];
}
