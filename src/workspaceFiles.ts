import * as vscode from "vscode";

export interface ExtractedFile {
  relativePath: string;
  content: string;
}

/** Reject absolute paths and `..` segments. */
export function isSafeRelativePath(p: string): boolean {
  const s = p.trim().replace(/\\/g, "/");
  if (!s || s.startsWith("/") || /^[a-zA-Z]:/.test(s)) {
    return false;
  }
  const parts = s.split("/").filter(Boolean);
  if (parts.some((x) => x === "." || x === "..")) {
    return false;
  }
  return true;
}

function pathFromFenceHeader(header: string): string | undefined {
  const h = header.trim();
  if (!h) {
    return undefined;
  }
  const parts = h.split(/\s+/);
  if (parts.length < 2) {
    return undefined;
  }
  const last = parts[parts.length - 1];
  if (last.includes(".") && /^[\w./-]+$/.test(last) && !last.startsWith(".")) {
    return last;
  }
  return undefined;
}

/** First line: `# path.ext` or `// file: path` */
function pathFromFirstLine(body: string): string | undefined {
  const first = body.split(/\r?\n/)[0] ?? "";
  const mHash = first.match(/^#\s+([\w./-]+\.[a-zA-Z0-9]+)\s*$/);
  if (mHash && !isDecorativeFilename(mHash[1])) {
    return mHash[1];
  }
  const mFile = first.match(/^\/\/\s*file:\s*([\w./-]+\.[a-zA-Z0-9]+)\s*$/i);
  if (mFile) {
    return mFile[1];
  }
  return undefined;
}

/** Scan first lines for `# path/to/file.ext` (skip decorative `# ===` lines). */
function pathFromBodyScan(body: string): string | undefined {
  const lines = body.split(/\r?\n/);
  for (let i = 0; i < Math.min(lines.length, 80); i++) {
    const line = lines[i].trim();
    const m = line.match(/^#\s+([\w./-]+\.[a-zA-Z0-9]+)\s*$/);
    if (!m) {
      continue;
    }
    const p = m[1];
    if (isDecorativeFilename(p)) {
      continue;
    }
    if (isSafeRelativePath(p)) {
      return p;
    }
  }
  return undefined;
}

function isDecorativeFilename(name: string): boolean {
  const base = name.split("/").pop() ?? name;
  const noExt = base.includes(".") ? base.slice(0, base.lastIndexOf(".")) : base;
  if (noExt.length >= 4 && /^[=#\-_]{3,}$/.test(noExt)) {
    return true;
  }
  return false;
}

interface FenceBlock {
  header: string;
  body: string;
  start: number;
  end: number;
  lang: string;
}

function parseFenceBlocks(text: string): FenceBlock[] {
  const out: FenceBlock[] = [];
  const re = /```([^\n`]*)\n([\s\S]*?)```/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const header = m[1];
    const body = m[2];
    const start = m.index;
    const end = m.index + m[0].length;
    const lang = (header.trim().split(/\s+/)[0] || "").toLowerCase();
    out.push({ header, body, start, end, lang });
  }
  return out;
}

/** Same pseudo-fence rules as media/chatMarkdown.js so extraction matches UI. */
export function normalizeModelFencesForExtraction(raw: string): string {
  const NL = "\n";
  let t = raw.replace(/\r\n/g, NL).replace(/\r/g, NL);
  const pseudo: Record<string, string> = {
    PLAINTEXT: "plaintext",
    TXT: "plaintext",
    TEXT: "plaintext",
    JSON: "json",
    TS: "typescript",
    TYPESCRIPT: "typescript",
    TSX: "tsx",
    JS: "javascript",
    JAVASCRIPT: "javascript",
    JSX: "jsx",
    BASH: "bash",
    SH: "bash",
    SHELL: "bash",
    ZSH: "bash",
    CSS: "css",
    SCSS: "scss",
    HTML: "html",
    XML: "xml",
    SQL: "sql",
    PY: "python",
    PYTHON: "python",
    MD: "markdown",
    MARKDOWN: "markdown",
    YAML: "yaml",
    YML: "yaml",
    ENV: "bash",
    DOCKERFILE: "dockerfile",
    NGINX: "nginx",
    GRAPHQL: "graphql",
  };
  const lines = t.split(NL);
  const out: string[] = [];
  for (const line of lines) {
    const tr = line.trim();
    const up = tr.toUpperCase();
    if (pseudo[up]) {
      out.push("```" + pseudo[up]);
    } else if (up === "CODE") {
      out.push("```");
    } else {
      out.push(line);
    }
  }
  t = out.join(NL);
  let n = 0;
  let p = 0;
  while ((p = t.indexOf("```", p)) !== -1) {
    n++;
    p += 3;
  }
  if (n % 2 === 1) {
    t += NL + "```";
  }
  return t;
}

interface ProseName {
  path: string;
  index: number;
}

function collectProseFilenames(text: string): ProseName[] {
  const found: ProseName[] = [];
  const seen = new Set<string>();
  const add = (path: string, index: number) => {
    const p = path.replace(/\\/g, "/").trim();
    if (!p || seen.has(p) || !isSafeRelativePath(p)) {
      return;
    }
    seen.add(p);
    found.push({ path: p, index });
  };

  const patterns: RegExp[] = [
    /(?:Save (?:this )?as|save (?:to|file)|write (?:to|file)|create (?:a )?file)\s*[:\s]*[`"']([\w./-]+\.[a-zA-Z0-9]{1,8})[`"']?/gi,
    /(?:Save (?:this )?as|save (?:to|file))\s+([\w./-]+\.[a-zA-Z0-9]{1,8})\s*$/gim,
    /(?:^|\n)\s*Save as\s+([\w./-]+\.[a-zA-Z0-9]{1,8})\s*(?:\n|$)/gi,
    /`([\w./-]+\.(?:py|ts|tsx|js|jsx|mjs|cjs|json|md|markdown|html|css|scss|less|rs|go|java|kt|swift|rb|php|vue|svelte|sh))`/gi,
    /\bpython3?\s+([\w./-]+\.py)\b/gi,
    /\bnode\s+([\w./-]+\.(?:js|mjs|cjs))\b/gi,
    /(?:^|\n)\s*\d+\.\s+([\w./-]+\.[a-zA-Z0-9]{1,8})\s*(?=\r?\n|$)/gim,
  ];

  for (const re of patterns) {
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      add(m[1], m.index);
    }
  }

  found.sort((a, b) => a.index - b.index);
  const dedup: ProseName[] = [];
  const paths = new Set<string>();
  for (const f of found) {
    if (!paths.has(f.path)) {
      paths.add(f.path);
      dedup.push(f);
    }
  }
  return dedup;
}

function isSkippableShellFence(block: FenceBlock): boolean {
  const { lang, body } = block;
  if (lang !== "bash" && lang !== "sh" && lang !== "zsh" && lang !== "shell") {
    return false;
  }
  const t = body.trim();
  if (t.length > 800) {
    return false;
  }
  if (/^#!/.test(t)) {
    return false;
  }
  if (/^python3?\s+[\w./-]+\.py\s*$/i.test(t)) {
    return true;
  }
  if (/^(?:pip|npm|yarn|pnpm|curl|wget|cd|mkdir)\s/m.test(t)) {
    return true;
  }
  if (t.split("\n").length <= 3 && !t.includes("def ") && !t.includes("function ")) {
    return true;
  }
  return false;
}

function trimBlockContent(body: string, hadPathLine: boolean): string {
  let content = body;
  if (hadPathLine) {
    content = body.split("\n").slice(1).join("\n");
  }
  return content.replace(/^\s*\n/, "").replace(/\n+$/, "");
}

function blockExplicitPath(block: FenceBlock): string | undefined {
  return (
    pathFromFenceHeader(block.header) ??
    pathFromFirstLine(block.body) ??
    pathFromBodyScan(block.body)
  );
}

/** `Save as path/to/file.ext` on its own line, then a ``` fenced block (common model pattern). */
function extractSaveAsThenFence(text: string): ExtractedFile[] {
  const norm = text.replace(/\r\n/g, "\n");
  const out: ExtractedFile[] = [];
  const re =
    /(?:^|\n)\s*Save as\s+([\w./-]+\.[a-zA-Z0-9]{1,8})\s*\r?\n+\s*```[^\n]*\r?\n([\s\S]*?)```/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(norm)) !== null) {
    const path = m[1].replace(/\\/g, "/").trim();
    let inner = m[2];
    const firstLine = inner.split(/\r?\n/)[0] ?? "";
    const langMatch = firstLine.match(/^([a-zA-Z0-9_-]+)\s*$/);
    if (langMatch && /^[A-Z]{2,12}$/.test(langMatch[1])) {
      inner = inner.split(/\r?\n/).slice(1).join("\n");
    }
    const body = inner.replace(/^\s*\n/, "").replace(/\n+$/, "");
    if (isSafeRelativePath(path)) {
      out.push({ relativePath: path, content: body });
    }
  }
  return out;
}

/** Closing ``` then `Save as path` (some models put the hint after the block). */
function extractFenceThenSaveAs(text: string): ExtractedFile[] {
  const norm = text.replace(/\r\n/g, "\n");
  const out: ExtractedFile[] = [];
  const re =
    /```[\s\S]*?```\s*\r?\n\s*Save as\s+([\w./-]+\.[a-zA-Z0-9]{1,8})\s*(?:\r?\n|$)/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(norm)) !== null) {
    const full = m[0];
    const fenceMatch = /^```[^\n]*\n([\s\S]*?)```/.exec(full);
    if (!fenceMatch) {
      continue;
    }
    const path = m[1].replace(/\\/g, "/").trim();
    let body = fenceMatch[1];
    const fl = body.split(/\r?\n/)[0] ?? "";
    if (/^[A-Z]{2,12}$/.test(fl.trim())) {
      body = body.split(/\r?\n/).slice(1).join("\n");
    }
    body = body.replace(/^\s*\n/, "").replace(/\n+$/, "");
    if (isSafeRelativePath(path)) {
      out.push({ relativePath: path, content: body });
    }
  }
  return out;
}

function mergeExtracted(primary: ExtractedFile[], extra: ExtractedFile[]): ExtractedFile[] {
  const seen = new Set(primary.map((p) => p.relativePath));
  const out = [...primary];
  for (const e of extra) {
    if (!seen.has(e.relativePath)) {
      seen.add(e.relativePath);
      out.push(e);
    }
  }
  return out;
}

/**
 * Parses ``` blocks + prose ("Save as `file.py`") + pairs when model omits `# path`.
 */
export function extractFilesFromMarkdown(text: string): ExtractedFile[] {
  const normalized = normalizeModelFencesForExtraction(text);
  const fromSaveFence = extractSaveAsThenFence(normalized);
  const fromFenceSave = extractFenceThenSaveAs(normalized);
  const blocks = parseFenceBlocks(normalized);
  const prose = collectProseFilenames(normalized);
  const out: ExtractedFile[] = [];
  const unpaired: FenceBlock[] = [];

  for (const block of blocks) {
    if (isSkippableShellFence(block)) {
      continue;
    }
    const explicit = blockExplicitPath(block);
    if (explicit && isSafeRelativePath(explicit)) {
      const hadFirst = !!pathFromFirstLine(block.body);
      out.push({
        relativePath: explicit.replace(/\\/g, "/"),
        content: trimBlockContent(block.body, hadFirst),
      });
      continue;
    }
    unpaired.push(block);
  }

  const usedNames = new Set(out.map((o) => o.relativePath));
  const proseQueue = prose.filter((p) => !usedNames.has(p.path));

  for (const block of unpaired.sort((a, b) => a.start - b.start)) {
    const after = proseQueue.filter((p) => p.index > block.end);
    const before = proseQueue.filter((p) => p.index < block.start);
    let pick: ProseName | undefined = after[0];
    if (!pick && before.length > 0) {
      pick = before[before.length - 1];
    }
    if (!pick && proseQueue.length === 1 && unpaired.length === 1) {
      pick = proseQueue[0];
    }
    if (!pick && proseQueue.length > 0) {
      pick = proseQueue[0];
    }
    if (!pick) {
      continue;
    }
    const idx = proseQueue.indexOf(pick);
    if (idx >= 0) {
      proseQueue.splice(idx, 1);
    }
    usedNames.add(pick.path);
    out.push({
      relativePath: pick.path,
      content: trimBlockContent(block.body, false),
    });
  }

  return mergeExtracted(mergeExtracted(out, fromSaveFence), fromFenceSave);
}

async function mkdirpParentOfFile(root: vscode.Uri, fileSegments: string[]): Promise<void> {
  if (fileSegments.length <= 1) {
    return;
  }
  for (let depth = 1; depth <= fileSegments.length - 1; depth++) {
    const dir = vscode.Uri.joinPath(root, ...fileSegments.slice(0, depth));
    try {
      await vscode.workspace.fs.stat(dir);
    } catch {
      await vscode.workspace.fs.createDirectory(dir);
    }
  }
}

export async function writeExtractedFiles(files: ExtractedFile[]): Promise<boolean> {
  if (files.length === 0) {
    return false;
  }
  const folder = vscode.workspace.workspaceFolders?.[0];
  if (!folder) {
    void vscode.window
      .showErrorMessage(
        "Open a folder first so ASI can write files to disk.",
        "Open Folder…"
      )
      .then((choice) => {
        if (choice === "Open Folder…") {
          void vscode.commands.executeCommand("workbench.action.files.openFolder");
        }
      });
    return false;
  }
  for (const f of files) {
    if (!isSafeRelativePath(f.relativePath)) {
      vscode.window.showErrorMessage(`Invalid path: ${f.relativePath}`);
      return false;
    }
  }
  const written: vscode.Uri[] = [];
  for (const f of files) {
    const segments = f.relativePath.split("/").filter(Boolean);
    await mkdirpParentOfFile(folder.uri, segments);
    const uri = vscode.Uri.joinPath(folder.uri, ...segments);
    await vscode.workspace.fs.writeFile(uri, new TextEncoder().encode(f.content));
    written.push(uri);
  }

  try {
    await vscode.commands.executeCommand("workbench.files.action.refreshFilesExplorer");
  } catch {
    /* older builds */
  }
  vscode.window.showInformationMessage(
    `ASI: created ${written.length} file(s): ${files.map((x) => x.relativePath).join(", ")}`
  );
  return true;
}
