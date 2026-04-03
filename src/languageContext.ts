import * as vscode from "vscode";

export interface LanguageContextSnapshot {
  filePath: string;
  languageId: string;
  diagnostics: DiagnosticInfo[];
  symbols: SymbolInfo[];
  imports: string[];
  cursorContext?: CursorContext;
}

export interface DiagnosticInfo {
  message: string;
  severity: "error" | "warning" | "info" | "hint";
  range: { startLine: number; endLine: number };
  source?: string;
  code?: string;
}

export interface SymbolInfo {
  name: string;
  kind: string;
  range: { startLine: number; endLine: number };
  children?: SymbolInfo[];
}

export interface CursorContext {
  line: number;
  character: number;
  lineText: string;
  surroundingLines: string;
}

const SYMBOL_KIND_NAMES: Record<number, string> = {
  [vscode.SymbolKind.File]: "file",
  [vscode.SymbolKind.Module]: "module",
  [vscode.SymbolKind.Namespace]: "namespace",
  [vscode.SymbolKind.Package]: "package",
  [vscode.SymbolKind.Class]: "class",
  [vscode.SymbolKind.Method]: "method",
  [vscode.SymbolKind.Property]: "property",
  [vscode.SymbolKind.Field]: "field",
  [vscode.SymbolKind.Constructor]: "constructor",
  [vscode.SymbolKind.Enum]: "enum",
  [vscode.SymbolKind.Interface]: "interface",
  [vscode.SymbolKind.Function]: "function",
  [vscode.SymbolKind.Variable]: "variable",
  [vscode.SymbolKind.Constant]: "constant",
  [vscode.SymbolKind.String]: "string",
  [vscode.SymbolKind.Number]: "number",
  [vscode.SymbolKind.Boolean]: "boolean",
  [vscode.SymbolKind.Array]: "array",
  [vscode.SymbolKind.Object]: "object",
  [vscode.SymbolKind.Key]: "key",
  [vscode.SymbolKind.Null]: "null",
  [vscode.SymbolKind.EnumMember]: "enumMember",
  [vscode.SymbolKind.Struct]: "struct",
  [vscode.SymbolKind.Event]: "event",
  [vscode.SymbolKind.Operator]: "operator",
  [vscode.SymbolKind.TypeParameter]: "typeParameter",
};

function severityString(s: vscode.DiagnosticSeverity): DiagnosticInfo["severity"] {
  switch (s) {
    case vscode.DiagnosticSeverity.Error: return "error";
    case vscode.DiagnosticSeverity.Warning: return "warning";
    case vscode.DiagnosticSeverity.Information: return "info";
    default: return "hint";
  }
}

export async function gatherLanguageContext(
  document: vscode.TextDocument,
  position?: vscode.Position
): Promise<LanguageContextSnapshot> {
  const uri = document.uri;
  const filePath = vscode.workspace.asRelativePath(uri);
  const languageId = document.languageId;

  const [diagnostics, symbols] = await Promise.all([
    gatherDiagnostics(uri),
    gatherDocumentSymbols(uri),
  ]);

  const imports = extractImports(document);

  let cursorContext: CursorContext | undefined;
  if (position) {
    const line = position.line;
    const startLine = Math.max(0, line - 5);
    const endLine = Math.min(document.lineCount - 1, line + 5);
    const range = new vscode.Range(startLine, 0, endLine, document.lineAt(endLine).text.length);
    cursorContext = {
      line: line + 1,
      character: position.character,
      lineText: document.lineAt(line).text,
      surroundingLines: document.getText(range),
    };
  }

  return { filePath, languageId, diagnostics, symbols, imports, cursorContext };
}

function gatherDiagnostics(uri: vscode.Uri): DiagnosticInfo[] {
  const raw = vscode.languages.getDiagnostics(uri);
  return raw
    .filter(d => d.severity <= vscode.DiagnosticSeverity.Warning)
    .slice(0, 20)
    .map(d => ({
      message: d.message,
      severity: severityString(d.severity),
      range: { startLine: d.range.start.line + 1, endLine: d.range.end.line + 1 },
      source: d.source,
      code: typeof d.code === "object" ? String(d.code.value) : d.code !== undefined ? String(d.code) : undefined,
    }));
}

async function gatherDocumentSymbols(uri: vscode.Uri): Promise<SymbolInfo[]> {
  try {
    const symbols = await vscode.commands.executeCommand<vscode.DocumentSymbol[]>(
      "vscode.executeDocumentSymbolProvider",
      uri
    );
    if (!symbols) return [];
    return symbols.slice(0, 50).map(mapSymbol);
  } catch {
    return [];
  }
}

function mapSymbol(s: vscode.DocumentSymbol): SymbolInfo {
  const info: SymbolInfo = {
    name: s.name,
    kind: SYMBOL_KIND_NAMES[s.kind] || "unknown",
    range: { startLine: s.range.start.line + 1, endLine: s.range.end.line + 1 },
  };
  if (s.children?.length) {
    info.children = s.children.slice(0, 20).map(mapSymbol);
  }
  return info;
}

function extractImports(doc: vscode.TextDocument): string[] {
  const text = doc.getText();
  const imports: string[] = [];
  const patterns = [
    /^import\s+.+$/gm,
    /^from\s+.+\s+import\s+.+$/gm,
    /^require\s*\(.+\)/gm,
    /^const\s+\w+\s*=\s*require\s*\(.+\)/gm,
    /^using\s+.+;$/gm,
    /^#include\s+.+$/gm,
    /^package\s+.+;?$/gm,
  ];
  for (const pattern of patterns) {
    let m: RegExpExecArray | null;
    while ((m = pattern.exec(text)) !== null) {
      imports.push(m[0].trim());
      if (imports.length >= 30) return imports;
    }
  }
  return imports;
}

export function formatContextForPrompt(ctx: LanguageContextSnapshot): string {
  const parts: string[] = [];
  parts.push(`File: ${ctx.filePath} (${ctx.languageId})`);

  if (ctx.diagnostics.length) {
    parts.push("\nDiagnostics:");
    for (const d of ctx.diagnostics) {
      parts.push(`  ${d.severity.toUpperCase()} L${d.range.startLine}: ${d.message}${d.source ? ` [${d.source}]` : ""}`);
    }
  }

  if (ctx.symbols.length) {
    parts.push("\nDocument outline:");
    for (const s of ctx.symbols.slice(0, 25)) {
      let line = `  ${s.kind} ${s.name} (L${s.range.startLine}–${s.range.endLine})`;
      if (s.children?.length) {
        line += ` → ${s.children.map(c => c.name).join(", ")}`;
      }
      parts.push(line);
    }
  }

  if (ctx.imports.length) {
    parts.push("\nImports:\n  " + ctx.imports.slice(0, 15).join("\n  "));
  }

  if (ctx.cursorContext) {
    parts.push(`\nCursor at line ${ctx.cursorContext.line}, col ${ctx.cursorContext.character}`);
  }

  return parts.join("\n");
}

export async function getWorkspaceDiagnosticsSummary(): Promise<string> {
  const all = vscode.languages.getDiagnostics();
  const errors: string[] = [];
  let errorCount = 0;
  let warnCount = 0;

  for (const [uri, diags] of all) {
    for (const d of diags) {
      if (d.severity === vscode.DiagnosticSeverity.Error) {
        errorCount++;
        if (errors.length < 15) {
          const rel = vscode.workspace.asRelativePath(uri);
          errors.push(`  ${rel}:${d.range.start.line + 1} — ${d.message}`);
        }
      } else if (d.severity === vscode.DiagnosticSeverity.Warning) {
        warnCount++;
      }
    }
  }

  if (!errorCount && !warnCount) return "";

  const lines = [`Workspace: ${errorCount} error(s), ${warnCount} warning(s)`];
  if (errors.length) {
    lines.push(...errors);
  }
  return lines.join("\n");
}

export async function getDefinitionContext(
  document: vscode.TextDocument,
  position: vscode.Position
): Promise<string> {
  try {
    const defs = await vscode.commands.executeCommand<vscode.Location[]>(
      "vscode.executeDefinitionProvider",
      document.uri,
      position
    );
    if (!defs?.length) return "";

    const parts: string[] = ["Definitions:"];
    for (const def of defs.slice(0, 3)) {
      const rel = vscode.workspace.asRelativePath(def.uri);
      const doc = await vscode.workspace.openTextDocument(def.uri);
      const startLine = Math.max(0, def.range.start.line - 2);
      const endLine = Math.min(doc.lineCount - 1, def.range.end.line + 5);
      const range = new vscode.Range(startLine, 0, endLine, doc.lineAt(endLine).text.length);
      const code = doc.getText(range);
      parts.push(`${rel}:${def.range.start.line + 1}\n\`\`\`${doc.languageId}\n${code}\n\`\`\``);
    }
    return parts.join("\n");
  } catch {
    return "";
  }
}

export async function getReferencesContext(
  document: vscode.TextDocument,
  position: vscode.Position
): Promise<string> {
  try {
    const refs = await vscode.commands.executeCommand<vscode.Location[]>(
      "vscode.executeReferenceProvider",
      document.uri,
      position
    );
    if (!refs?.length) return "";

    const parts: string[] = [`${refs.length} reference(s):`];
    for (const ref of refs.slice(0, 8)) {
      const rel = vscode.workspace.asRelativePath(ref.uri);
      parts.push(`  ${rel}:${ref.range.start.line + 1}`);
    }
    return parts.join("\n");
  } catch {
    return "";
  }
}
