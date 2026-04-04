import * as vscode from "vscode";

const HIGHLIGHT_DURATION_MS = 3000;

const insertedLineDecoration = vscode.window.createTextEditorDecorationType({
  backgroundColor: "rgba(40, 167, 69, 0.12)",
  isWholeLine: true,
  overviewRulerColor: "rgba(40, 167, 69, 0.6)",
  overviewRulerLane: vscode.OverviewRulerLane.Left,
});

const modifiedLineDecoration = vscode.window.createTextEditorDecorationType({
  backgroundColor: "rgba(255, 193, 7, 0.10)",
  isWholeLine: true,
  overviewRulerColor: "rgba(255, 193, 7, 0.5)",
  overviewRulerLane: vscode.OverviewRulerLane.Left,
});

/**
 * Compute a simple line-level diff and highlight changed/inserted lines.
 * Fades after HIGHLIGHT_DURATION_MS.
 */
export function flashChangedLines(
  editor: vscode.TextEditor,
  oldContent: string,
  newContent: string
): void {
  const oldLines = oldContent.split(/\r?\n/);
  const newLines = newContent.split(/\r?\n/);

  const insertedRanges: vscode.Range[] = [];
  const modifiedRanges: vscode.Range[] = [];

  for (let i = 0; i < newLines.length; i++) {
    if (i >= oldLines.length) {
      insertedRanges.push(lineRange(i));
    } else if (newLines[i] !== oldLines[i]) {
      modifiedRanges.push(lineRange(i));
    }
  }

  editor.setDecorations(insertedLineDecoration, insertedRanges);
  editor.setDecorations(modifiedLineDecoration, modifiedRanges);

  if (insertedRanges.length || modifiedRanges.length) {
    const firstChanged =
      insertedRanges[0] ?? modifiedRanges[0];
    if (firstChanged) {
      editor.revealRange(firstChanged, vscode.TextEditorRevealType.InCenter);
    }
  }

  setTimeout(() => {
    try {
      editor.setDecorations(insertedLineDecoration, []);
      editor.setDecorations(modifiedLineDecoration, []);
    } catch {
      /* editor may have been disposed */
    }
  }, HIGHLIGHT_DURATION_MS);
}

function lineRange(line: number): vscode.Range {
  return new vscode.Range(line, 0, line, Number.MAX_SAFE_INTEGER);
}
