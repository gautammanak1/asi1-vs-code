import * as vscode from "vscode";

export interface RecentEdit {
  filePath: string;
  languageId: string;
  timestamp: number;
  changePreview: string;
  linesChanged: number;
}

const MAX_TRACKED_EDITS = 30;
const recentEdits: RecentEdit[] = [];
let disposable: vscode.Disposable | undefined;

export function startTrackingEdits(context: vscode.ExtensionContext): void {
  if (disposable) return;

  disposable = vscode.workspace.onDidChangeTextDocument((e) => {
    if (e.document.uri.scheme !== "file") return;
    if (e.contentChanges.length === 0) return;

    const filePath = vscode.workspace.asRelativePath(e.document.uri);
    const languageId = e.document.languageId;
    let totalLines = 0;
    const previews: string[] = [];

    for (const change of e.contentChanges.slice(0, 3)) {
      const lines = change.text.split("\n").length;
      totalLines += Math.max(lines, change.range.end.line - change.range.start.line + 1);
      const preview = change.text.trim().slice(0, 120);
      if (preview) previews.push(preview);
    }

    if (totalLines === 0 && !previews.length) return;

    const existing = recentEdits.find(
      (ed) => ed.filePath === filePath && Date.now() - ed.timestamp < 2000
    );
    if (existing) {
      existing.timestamp = Date.now();
      existing.linesChanged += totalLines;
      existing.changePreview = previews[0] || existing.changePreview;
      return;
    }

    recentEdits.push({
      filePath,
      languageId,
      timestamp: Date.now(),
      changePreview: previews[0] || "",
      linesChanged: totalLines,
    });

    if (recentEdits.length > MAX_TRACKED_EDITS) {
      recentEdits.splice(0, recentEdits.length - MAX_TRACKED_EDITS);
    }
  });

  context.subscriptions.push(disposable);
}

export function getRecentEdits(maxAge: number = 300_000): RecentEdit[] {
  const cutoff = Date.now() - maxAge;
  return recentEdits.filter((e) => e.timestamp >= cutoff);
}

export function formatRecentEditsForPrompt(maxAge?: number): string {
  const edits = getRecentEdits(maxAge);
  if (!edits.length) return "";

  const lines = ["Recent user edits (last 5 minutes):"];
  const byFile = new Map<string, RecentEdit[]>();

  for (const e of edits) {
    const arr = byFile.get(e.filePath) || [];
    arr.push(e);
    byFile.set(e.filePath, arr);
  }

  for (const [file, fileEdits] of byFile) {
    const totalLines = fileEdits.reduce((s, e) => s + e.linesChanged, 0);
    const lang = fileEdits[0]?.languageId || "";
    lines.push(`  ${file} (${lang}): ${totalLines} line(s) changed`);
    const latest = fileEdits[fileEdits.length - 1];
    if (latest?.changePreview) {
      lines.push(`    latest: ${latest.changePreview.slice(0, 80)}`);
    }
  }

  return lines.join("\n");
}

export function getEditedFilesSince(ms: number): string[] {
  const cutoff = Date.now() - ms;
  const files = new Set<string>();
  for (const e of recentEdits) {
    if (e.timestamp >= cutoff) {
      files.add(e.filePath);
    }
  }
  return [...files];
}
