export const TERMINAL_ALLOWLIST = new Set([
  "ls", "dir", "cat", "head", "tail", "wc", "find", "grep", "rg",
  "echo", "printf", "pwd", "which", "whoami", "env", "printenv",
  "node", "npm", "npx", "yarn", "pnpm", "bun", "deno",
  "python", "python3", "pip", "pip3",
  "git", "gh",
  "tsc", "eslint", "prettier",
  "mkdir", "touch", "cp", "mv", "ln",
  "curl", "wget",
  "docker", "docker-compose",
  "make", "cmake",
  "cargo", "rustc",
  "go",
  "java", "javac", "mvn", "gradle",
  "ruby", "gem", "bundle",
  "php", "composer",
  "swift",
  "test", "[",
]);

export const BLOCKED_COMMANDS =
  /^\s*(rm\s+-rf\s+\/|sudo\s+rm|mkfs|dd\s+if=|:\(\)\{|chmod\s+777\s+\/|chown\s+.*\s+\/|>(\/dev\/|\/etc\/|\/usr\/)|format\s+[a-z]:|del\s+\/[sf])/i;

export function isCommandAllowed(command: string): boolean {
  const trimmed = command.trim();
  if (BLOCKED_COMMANDS.test(trimmed)) return false;

  const firstWord = trimmed.split(/\s+/)[0]?.replace(/^.*\//, "") ?? "";
  if (TERMINAL_ALLOWLIST.has(firstWord)) return true;

  if (
    trimmed.includes("&&") ||
    trimmed.includes("||") ||
    trimmed.includes("|") ||
    trimmed.includes(";")
  ) {
    const parts = trimmed.split(/\s*(?:&&|\|\||[|;])\s*/);
    return parts.every((part) => {
      const w = part.trim().split(/\s+/)[0]?.replace(/^.*\//, "") ?? "";
      return TERMINAL_ALLOWLIST.has(w);
    });
  }

  return false;
}
