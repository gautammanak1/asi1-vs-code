import * as vscode from "vscode";

export interface AuditEntry {
  timestamp: number;
  action: string;
  tool?: string;
  args?: string;
  result?: "success" | "error" | "denied";
  detail?: string;
}

const MAX_ENTRIES = 500;
const _entries: AuditEntry[] = [];

export function logAudit(entry: AuditEntry): void {
  _entries.push(entry);
  if (_entries.length > MAX_ENTRIES) {
    _entries.splice(0, _entries.length - MAX_ENTRIES);
  }
}

export function logToolExecution(tool: string, argsPreview: string, result: "success" | "error" | "denied", detail?: string): void {
  logAudit({
    timestamp: Date.now(),
    action: "tool_execution",
    tool,
    args: argsPreview.slice(0, 500),
    result,
    detail: detail?.slice(0, 1000),
  });
}

export function logFileWrite(path: string, result: "success" | "error" | "denied"): void {
  logAudit({ timestamp: Date.now(), action: "file_write", detail: path, result });
}

export function logFileDelete(path: string, result: "success" | "error" | "denied"): void {
  logAudit({ timestamp: Date.now(), action: "file_delete", detail: path, result });
}

export function logTerminalCommand(command: string, result: "success" | "error" | "denied"): void {
  logAudit({ timestamp: Date.now(), action: "terminal_command", detail: command.slice(0, 500), result });
}

export function getAuditLog(): readonly AuditEntry[] {
  return _entries;
}

export function clearAuditLog(): void {
  _entries.length = 0;
}

export function formatAuditLogText(): string {
  if (_entries.length === 0) return "No audit log entries.";
  return _entries
    .map((e) => {
      const ts = new Date(e.timestamp).toISOString();
      const parts = [ts, e.action];
      if (e.tool) parts.push(`tool=${e.tool}`);
      if (e.result) parts.push(`result=${e.result}`);
      if (e.detail) parts.push(e.detail);
      return parts.join(" | ");
    })
    .join("\n");
}

export function registerAuditCommands(ctx: vscode.ExtensionContext): void {
  ctx.subscriptions.push(
    vscode.commands.registerCommand("asiAssistant.showAuditLog", () => {
      const text = formatAuditLogText();
      vscode.workspace.openTextDocument({ content: text, language: "log" }).then(
        (doc) => vscode.window.showTextDocument(doc, { preview: true })
      );
    }),
    vscode.commands.registerCommand("asiAssistant.clearAuditLog", () => {
      clearAuditLog();
      vscode.window.showInformationMessage("Audit log cleared.");
    })
  );
}
