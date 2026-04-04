/**
 * Unit tests for safePath.ts — path validation and security.
 * Run with: npx tsx src/safePath.test.ts
 *
 * Inlines the pure validation logic to avoid the vscode dependency.
 */

import * as path from "path";

const ENCODED_TRAVERSAL = /%2e%2e/i;
const WIN_DRIVE = /^[a-zA-Z]:[/\\]/;
const UNC_PATH = /^[/\\]{2}/;

class PathSecurityError extends Error {
  constructor(message: string) {
    super(`[Path Security] ${message}`);
    this.name = "PathSecurityError";
  }
}

function sanitizeRelativePath(raw: string): string {
  if (!raw || typeof raw !== "string") throw new PathSecurityError("Empty path");
  let p = raw.trim().replace(/\\/g, "/");
  if (ENCODED_TRAVERSAL.test(p)) throw new PathSecurityError("Encoded traversal detected");
  if (WIN_DRIVE.test(p)) throw new PathSecurityError("Absolute Windows path rejected");
  if (UNC_PATH.test(p)) throw new PathSecurityError("UNC network path rejected");
  if (p.startsWith("/")) throw new PathSecurityError("Absolute path rejected");
  const normalized = path.normalize(p).replace(/\\/g, "/");
  const segments = normalized.split("/").filter(Boolean);
  for (const seg of segments) {
    if (seg === ".." || seg === ".") throw new PathSecurityError(`Traversal segment "${seg}" rejected`);
    if (/[\0]/.test(seg)) throw new PathSecurityError("Null byte in path");
  }
  if (segments.length === 0) throw new PathSecurityError("Path resolves to empty");
  return segments.join("/");
}

function isPathSafe(relativePath: string): boolean {
  try { sanitizeRelativePath(relativePath); return true; } catch { return false; }
}

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

function assertThrows(fn: () => void, msg: string): void {
  try {
    fn();
    failed++;
    console.error(`  FAIL (no throw): ${msg}`);
  } catch {
    passed++;
  }
}

console.log("=== safePath tests ===\n");

// Valid paths
console.log("Valid paths:");
assert(sanitizeRelativePath("src/index.ts") === "src/index.ts", "simple nested path");
assert(sanitizeRelativePath("file.txt") === "file.txt", "root-level file");
assert(sanitizeRelativePath("a/b/c/d.json") === "a/b/c/d.json", "deep path");
assert(sanitizeRelativePath("src\\components\\App.tsx") === "src/components/App.tsx", "backslash normalization");

// Traversal attacks
console.log("\nTraversal attacks:");
assertThrows(() => sanitizeRelativePath("../../../etc/passwd"), "parent traversal");
assertThrows(() => sanitizeRelativePath("src/../../etc/passwd"), "nested traversal");
assertThrows(() => sanitizeRelativePath("..\\..\\windows\\system32"), "Windows traversal");
assertThrows(() => sanitizeRelativePath("%2e%2e/etc/passwd"), "encoded traversal");
assertThrows(() => sanitizeRelativePath("%2E%2E/secret"), "uppercase encoded traversal");

// Absolute paths
console.log("\nAbsolute paths:");
assertThrows(() => sanitizeRelativePath("/etc/passwd"), "unix absolute");
assertThrows(() => sanitizeRelativePath("C:\\Windows\\System32"), "Windows drive");
assertThrows(() => sanitizeRelativePath("C:/Users/admin"), "Windows forward-slash drive");
assertThrows(() => sanitizeRelativePath("\\\\server\\share"), "UNC path");
assertThrows(() => sanitizeRelativePath("//server/share"), "UNC forward-slash");

// Edge cases
console.log("\nEdge cases:");
assertThrows(() => sanitizeRelativePath(""), "empty string");
assertThrows(() => sanitizeRelativePath("   "), "whitespace only");
assertThrows(() => sanitizeRelativePath("."), "dot only");
assertThrows(() => sanitizeRelativePath(".."), "double dot only");
assert(sanitizeRelativePath("src/./index.ts") === "src/index.ts", "normalize ./");

// Null bytes
console.log("\nNull byte injection:");
assertThrows(() => sanitizeRelativePath("src/\0evil.ts"), "null byte");

// isPathSafe
console.log("\nisPathSafe():");
assert(isPathSafe("src/index.ts") === true, "valid path returns true");
assert(isPathSafe("../escape") === false, "traversal returns false");
assert(isPathSafe("/etc/passwd") === false, "absolute returns false");
assert(isPathSafe("") === false, "empty returns false");

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
if (failed > 0) process.exit(1);
