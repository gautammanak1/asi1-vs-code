import * as vscode from "vscode";

export interface LoggedRequest {
  id: string;
  timestamp: number;
  type: "chat" | "completion" | "tool" | "image";
  model: string;
  promptTokensEstimate: number;
  completionTokensEstimate: number;
  durationMs: number;
  status: "success" | "error" | "cancelled";
  error?: string;
  messages?: Array<{ role: string; contentPreview: string }>;
  toolCalls?: Array<{ name: string; durationMs: number }>;
}

const MAX_LOG_ENTRIES = 200;
const logEntries: LoggedRequest[] = [];
const _onDidLog = new vscode.EventEmitter<LoggedRequest>();
export const onDidLogRequest = _onDidLog.event;

let requestCounter = 0;

export function logRequest(entry: Omit<LoggedRequest, "id">): LoggedRequest {
  const id = `req_${++requestCounter}_${Date.now().toString(36)}`;
  const full: LoggedRequest = { id, ...entry };
  logEntries.push(full);
  if (logEntries.length > MAX_LOG_ENTRIES) {
    logEntries.splice(0, logEntries.length - MAX_LOG_ENTRIES);
  }
  _onDidLog.fire(full);
  return full;
}

export function getLogEntries(): readonly LoggedRequest[] {
  return logEntries;
}

export function clearLog(): void {
  logEntries.length = 0;
}

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 3.5);
}

export function logChatRequest(opts: {
  model: string;
  messages: Array<{ role: string; content: string }>;
  startTime: number;
  response: string;
  status: "success" | "error" | "cancelled";
  error?: string;
  toolCalls?: Array<{ name: string; durationMs: number }>;
}): LoggedRequest {
  const promptText = opts.messages.map(m => m.content).join(" ");
  return logRequest({
    timestamp: Date.now(),
    type: opts.toolCalls?.length ? "tool" : "chat",
    model: opts.model,
    promptTokensEstimate: estimateTokens(promptText),
    completionTokensEstimate: estimateTokens(opts.response),
    durationMs: Date.now() - opts.startTime,
    status: opts.status,
    error: opts.error,
    messages: opts.messages.map(m => ({
      role: m.role,
      contentPreview: m.content.slice(0, 200),
    })),
    toolCalls: opts.toolCalls,
  });
}

export function registerRequestLoggerCommands(
  context: vscode.ExtensionContext
): void {
  context.subscriptions.push(
    vscode.commands.registerCommand("asiAssistant.showRequestLog", () => {
      showRequestLogPanel(context);
    }),
    vscode.commands.registerCommand("asiAssistant.clearRequestLog", () => {
      clearLog();
      vscode.window.showInformationMessage("Request log cleared.");
    })
  );
}

function showRequestLogPanel(context: vscode.ExtensionContext): void {
  const panel = vscode.window.createWebviewPanel(
    "asiAssistant.requestLog",
    "Fetch Coder: Request Log",
    vscode.ViewColumn.Two,
    { enableScripts: true }
  );

  const updateContent = () => {
    const entries = getLogEntries();
    const rows = entries
      .slice()
      .reverse()
      .map(e => {
        const statusIcon = e.status === "success" ? "✓" : e.status === "error" ? "✗" : "⊘";
        const statusColor = e.status === "success" ? "#4ade80" : e.status === "error" ? "#f87171" : "#fbbf24";
        const toolInfo = e.toolCalls?.length ? ` (${e.toolCalls.length} tools)` : "";
        const preview = e.messages?.[e.messages.length - 1]?.contentPreview || "";
        return `<tr>
          <td style="color:${statusColor}">${statusIcon}</td>
          <td>${e.type}${toolInfo}</td>
          <td>${e.model}</td>
          <td>${e.durationMs}ms</td>
          <td>~${e.promptTokensEstimate}/${e.completionTokensEstimate}</td>
          <td class="preview">${escapeHtml(preview.slice(0, 80))}</td>
          <td>${new Date(e.timestamp).toLocaleTimeString()}</td>
        </tr>`;
      })
      .join("");

    const totalRequests = entries.length;
    const totalErrors = entries.filter(e => e.status === "error").length;
    const avgDuration = entries.length
      ? Math.round(entries.reduce((s, e) => s + e.durationMs, 0) / entries.length)
      : 0;

    panel.webview.html = `<!DOCTYPE html>
<html><head><style>
body { font-family: var(--vscode-font-family, sans-serif); background: #0a0a0f; color: #e5e7eb; margin: 0; padding: 16px; }
h2 { font-size: 14px; color: #93c5fd; margin: 0 0 12px; }
.stats { display: flex; gap: 16px; margin-bottom: 16px; font-size: 12px; }
.stat { padding: 8px 12px; border-radius: 8px; background: #111827; border: 1px solid #1f2937; }
.stat b { color: #60a5fa; }
table { width: 100%; border-collapse: collapse; font-size: 11px; }
th { text-align: left; padding: 6px 8px; background: #111827; border-bottom: 1px solid #1f2937; color: #94a3b8; font-weight: 600; }
td { padding: 5px 8px; border-bottom: 1px solid #111827; }
.preview { max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #94a3b8; }
tr:hover td { background: #111827; }
</style></head><body>
<h2>Fetch Coder Request Log</h2>
<div class="stats">
  <div class="stat"><b>${totalRequests}</b> requests</div>
  <div class="stat"><b>${totalErrors}</b> errors</div>
  <div class="stat"><b>${avgDuration}ms</b> avg latency</div>
</div>
<table>
<thead><tr><th></th><th>Type</th><th>Model</th><th>Duration</th><th>Tokens (in/out)</th><th>Last Message</th><th>Time</th></tr></thead>
<tbody>${rows || '<tr><td colspan="7" style="text-align:center;color:#64748b;padding:20px">No requests logged yet</td></tr>'}</tbody>
</table>
</body></html>`;
  };

  updateContent();
  const disposable = onDidLogRequest(() => updateContent());
  panel.onDidDispose(() => disposable.dispose());
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
