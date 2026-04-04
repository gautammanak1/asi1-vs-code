import * as path from "path";
import * as vscode from "vscode";

const ENCODED_TRAVERSAL = /%2e%2e/i;
const WIN_DRIVE = /^[a-zA-Z]:[/\\]/;
const UNC_PATH = /^[/\\]{2}/;

export function getWorkspaceRoot(): vscode.Uri | undefined {
  return vscode.workspace.workspaceFolders?.[0]?.uri;
}

export function requireWorkspaceRoot(): vscode.Uri {
  const root = getWorkspaceRoot();
  if (!root) {
    throw new Error("No workspace folder open.");
  }
  return root;
}

/**
 * Validate and resolve a relative path against the workspace root.
 * Throws if the path escapes the workspace boundary.
 */
export function resolveWorkspacePath(relativePath: string): {
  uri: vscode.Uri;
  rel: string;
} {
  const root = requireWorkspaceRoot();
  const cleaned = sanitizeRelativePath(relativePath);
  const uri = vscode.Uri.joinPath(root, cleaned);
  assertInsideWorkspace(uri, root);
  return { uri, rel: cleaned };
}

export function sanitizeRelativePath(raw: string): string {
  if (!raw || typeof raw !== "string") {
    throw new PathSecurityError("Empty path");
  }

  let p = raw.trim().replace(/\\/g, "/");

  if (ENCODED_TRAVERSAL.test(p)) {
    throw new PathSecurityError("Encoded traversal detected");
  }
  if (WIN_DRIVE.test(p)) {
    throw new PathSecurityError("Absolute Windows path rejected");
  }
  if (UNC_PATH.test(p)) {
    throw new PathSecurityError("UNC network path rejected");
  }
  if (p.startsWith("/")) {
    throw new PathSecurityError("Absolute path rejected");
  }

  const normalized = path.normalize(p).replace(/\\/g, "/");
  const segments = normalized.split("/").filter(Boolean);

  for (const seg of segments) {
    if (seg === ".." || seg === ".") {
      throw new PathSecurityError(`Traversal segment "${seg}" rejected`);
    }
    if (/[\0]/.test(seg)) {
      throw new PathSecurityError("Null byte in path");
    }
  }

  if (segments.length === 0) {
    throw new PathSecurityError("Path resolves to empty");
  }

  return segments.join("/");
}

export function assertInsideWorkspace(
  target: vscode.Uri,
  root: vscode.Uri
): void {
  const rootPath = root.fsPath;
  const targetPath = path.resolve(target.fsPath);
  const resolvedRoot = path.resolve(rootPath);

  if (
    !targetPath.startsWith(resolvedRoot + path.sep) &&
    targetPath !== resolvedRoot
  ) {
    throw new PathSecurityError(
      "Path resolves outside workspace boundary"
    );
  }
}

export function isPathSafe(relativePath: string): boolean {
  try {
    sanitizeRelativePath(relativePath);
    return true;
  } catch {
    return false;
  }
}

export class PathSecurityError extends Error {
  constructor(message: string) {
    super(`[Path Security] ${message}`);
    this.name = "PathSecurityError";
  }
}
