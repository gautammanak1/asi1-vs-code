import * as vscode from "vscode";
import * as cp from "child_process";
import {
  sanitizeRelativePath,
  resolveWorkspacePath,
  PathSecurityError,
} from "../safePath";
import { isCommandAllowed, TERMINAL_ALLOWLIST } from "../security/commandAllowlist";
import { logToolExecution, logTerminalCommand, logFileWrite, logFileDelete } from "../security/auditLogger";

function safePath(raw: unknown): string {
  const rel = typeof raw === "string" ? raw.trim() : "";
  if (!rel) throw new PathSecurityError("Empty path");
  return sanitizeRelativePath(rel);
}

export async function executeBuiltinTool(name: string, argsJson: string): Promise<string> {
  let args: Record<string, unknown>;
  try {
    args = JSON.parse(argsJson || "{}") as Record<string, unknown>;
  } catch {
    logToolExecution(name, argsJson, "error", "Invalid JSON");
    return JSON.stringify({ error: "Invalid JSON arguments for tool" });
  }

  const folders = vscode.workspace.workspaceFolders;
  if (!folders?.length) {
    return JSON.stringify({ error: "No workspace folder open." });
  }
  const root = folders[0].uri;

  try {
    if (name === "workspace_read_file") {
      const rel = safePath(args.path);
      const { uri } = resolveWorkspacePath(rel);
      const bytes = await vscode.workspace.fs.readFile(uri);
      const text = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
      const max = 100_000;
      const clipped = text.length > max ? text.slice(0, max) + "\n… [truncated]" : text;
      logToolExecution(name, rel, "success");
      return JSON.stringify({ path: rel, content: clipped });
    }

    if (name === "workspace_search_files") {
      const pattern = typeof args.pattern === "string" ? args.pattern : "**/*";
      const maxN = Math.min(100, typeof args.maxResults === "number" && args.maxResults > 0 ? args.maxResults : 50);
      const uris = await vscode.workspace.findFiles(
        new vscode.RelativePattern(folders[0], pattern),
        "**/node_modules/**",
        maxN
      );
      const rels = uris.map((u) => vscode.workspace.asRelativePath(u, false));
      logToolExecution(name, pattern, "success");
      return JSON.stringify({ pattern, files: rels, count: rels.length });
    }

    if (name === "workspace_list_directory") {
      const rel = safePath(args.path);
      const maxN = Math.min(300, typeof args.maxResults === "number" && args.maxResults > 0 ? args.maxResults : 100);
      const { uri: dirUri } = resolveWorkspacePath(rel);
      const entries = await vscode.workspace.fs.readDirectory(dirUri);
      const mapped = entries.slice(0, maxN).map(([n, type]) => ({
        name: n,
        type: type === vscode.FileType.Directory ? "directory" : type === vscode.FileType.File ? "file" : "other",
      }));
      logToolExecution(name, rel, "success");
      return JSON.stringify({ path: rel, entries: mapped, count: mapped.length });
    }

    if (name === "workspace_scan_recursive") {
      const startPath = typeof args.path === "string" ? args.path.trim() : "";
      const maxDepth = Math.min(10, typeof args.maxDepth === "number" ? args.maxDepth : 5);
      const maxFiles = Math.min(1000, typeof args.maxFiles === "number" ? args.maxFiles : 500);
      const { readDirectoryRecursive } = await import("../workspaceManager");
      const files = await readDirectoryRecursive(startPath, maxDepth, maxFiles);
      logToolExecution(name, startPath || ".", "success");
      return JSON.stringify({ path: startPath || ".", files, count: files.length });
    }

    if (name === "workspace_write_file") {
      const rel = safePath(args.path);
      const content = typeof args.content === "string" ? args.content : "";
      const maxBytes = 200_000;
      if (content.length > maxBytes) {
        logFileWrite(rel, "error");
        return JSON.stringify({ error: `Content too large (${content.length} chars). Max ${maxBytes}.`, path: rel });
      }
      const { uri } = resolveWorkspacePath(rel);
      const segments = rel.split("/").filter(Boolean);
      if (segments.length > 1) {
        const parentUri = vscode.Uri.joinPath(root, ...segments.slice(0, -1));
        await vscode.workspace.fs.createDirectory(parentUri);
      }
      const bytes = new TextEncoder().encode(content);
      await vscode.workspace.fs.writeFile(uri, bytes);
      logFileWrite(rel, "success");
      return JSON.stringify({ path: rel, writtenChars: content.length, ok: true });
    }

    if (name === "workspace_create_directory") {
      const rel = safePath(args.path);
      const { uri } = resolveWorkspacePath(rel);
      await vscode.workspace.fs.createDirectory(uri);
      logToolExecution(name, rel, "success");
      return JSON.stringify({ path: rel, ok: true });
    }

    if (name === "workspace_delete_file") {
      const rel = safePath(args.path);
      const { deleteFileWithConfirmation } = await import("../workspaceManager");
      const ok = await deleteFileWithConfirmation(rel);
      logFileDelete(rel, ok ? "success" : "denied");
      return JSON.stringify({ path: rel, deleted: ok });
    }

    if (name === "workspace_rename_file") {
      const fromRel = safePath(args.fromPath);
      const toRel = safePath(args.toPath);
      const { renameFileWithConfirmation } = await import("../workspaceManager");
      const ok = await renameFileWithConfirmation(fromRel, toRel);
      logToolExecution(name, `${fromRel} → ${toRel}`, ok ? "success" : "denied");
      return JSON.stringify({ from: fromRel, to: toRel, renamed: ok });
    }

    if (name === "workspace_patch_file") {
      const rel = safePath(args.path);
      const search = typeof args.search === "string" ? args.search : "";
      const replace = typeof args.replace === "string" ? args.replace : "";
      const useRegex = args.regex === true;
      const replaceAll = args.all === true;

      if (!search) {
        return JSON.stringify({ error: "Empty search string", path: rel });
      }

      const { uri } = resolveWorkspacePath(rel);
      const bytes = await vscode.workspace.fs.readFile(uri);
      let text = new TextDecoder().decode(bytes);

      let count = 0;
      if (useRegex) {
        const flags = replaceAll ? "g" : "";
        const re = new RegExp(search, flags);
        text = text.replace(re, () => { count++; return replace; });
      } else if (replaceAll) {
        while (text.includes(search)) {
          text = text.replace(search, replace);
          count++;
          if (count > 10_000) break;
        }
      } else {
        if (text.includes(search)) {
          text = text.replace(search, replace);
          count = 1;
        }
      }

      if (count === 0) {
        logToolExecution(name, rel, "error", "Pattern not found");
        return JSON.stringify({ error: "Pattern not found in file", path: rel, search: search.slice(0, 100) });
      }

      await vscode.workspace.fs.writeFile(uri, new TextEncoder().encode(text));
      logFileWrite(rel, "success");
      return JSON.stringify({ path: rel, replacements: count, ok: true });
    }

    if (name === "workspace_search_text") {
      const query = typeof args.query === "string" ? args.query : "";
      const include = typeof args.include === "string" ? args.include : "**/*";
      const maxResults = Math.min(100, typeof args.maxResults === "number" ? args.maxResults : 30);
      const useRegex = args.regex === true;

      if (!query) {
        return JSON.stringify({ error: "Empty search query" });
      }

      const uris = await vscode.workspace.findFiles(
        include,
        "{**/node_modules/**,**/dist/**,**/.git/**,**/build/**,**/coverage/**,**/.next/**}",
        500
      );

      const results: Array<{ file: string; line: number; text: string }> = [];
      const pattern = useRegex ? new RegExp(query) : null;

      for (const uri of uris) {
        if (results.length >= maxResults) break;
        try {
          const bytes = await vscode.workspace.fs.readFile(uri);
          const text = new TextDecoder().decode(bytes);
          if (text.length > 500_000) continue;
          const lines = text.split(/\r?\n/);
          for (let i = 0; i < lines.length; i++) {
            if (results.length >= maxResults) break;
            const match = pattern ? pattern.test(lines[i]) : lines[i].includes(query);
            if (match) {
              results.push({
                file: vscode.workspace.asRelativePath(uri, false),
                line: i + 1,
                text: lines[i].slice(0, 200),
              });
            }
          }
        } catch {
          /* skip */
        }
      }

      logToolExecution(name, query, "success");
      return JSON.stringify({ query, matches: results, count: results.length });
    }

    if (name === "run_terminal_command") {
      const command = typeof args.command === "string" ? args.command.trim() : "";
      if (!command) {
        return JSON.stringify({ error: "No command provided" });
      }
      if (!isCommandAllowed(command)) {
        logTerminalCommand(command, "denied");
        return JSON.stringify({
          error: `Command not in allowlist. Allowed: ${[...TERMINAL_ALLOWLIST].slice(0, 20).join(", ")}…`,
          command,
        });
      }
      const cwd = root.fsPath;
      const timeout = 60_000;
      const result = await new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
        const proc = cp.spawn("sh", ["-c", command], {
          cwd,
          timeout,
          stdio: ["ignore", "pipe", "pipe"],
          env: { ...process.env, FORCE_COLOR: "0" },
        });
        let stdout = "";
        let stderr = "";
        proc.stdout.on("data", (d: Buffer) => { stdout += d.toString(); });
        proc.stderr.on("data", (d: Buffer) => { stderr += d.toString(); });
        proc.on("close", (code) => {
          if (code !== 0 && !stdout && !stderr) {
            reject(new Error(`Exit code ${code}`));
          } else {
            resolve({ stdout, stderr });
          }
        });
        proc.on("error", reject);
      });
      logTerminalCommand(command, "success");
      return JSON.stringify({
        command,
        stdout: result.stdout.slice(0, 50_000),
        stderr: result.stderr.slice(0, 10_000),
        ok: true,
      });
    }

    logToolExecution(name, argsJson, "error", "Unknown tool");
    return JSON.stringify({ error: `Unknown tool: ${name}` });

  } catch (e) {
    if (e instanceof PathSecurityError) {
      logToolExecution(name, argsJson.slice(0, 200), "denied", e.message);
      return JSON.stringify({ error: e.message });
    }
    const msg = e instanceof Error ? e.message : String(e);
    logToolExecution(name, argsJson.slice(0, 200), "error", msg);
    return JSON.stringify({ error: msg.slice(0, 5_000) });
  }
}
