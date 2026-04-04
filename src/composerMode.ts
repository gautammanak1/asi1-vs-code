import * as vscode from "vscode";
import { runChatWithTools, type ApiChatMessage, type ToolExecutionEvent } from "./asiClient";
import { getProjectContext, indexWorkspaceSymbols, type ProjectContext } from "./contextIndexer";
import { readDirectoryRecursive } from "./workspaceManager";

export type ComposerStage =
  | "idle"
  | "understanding"
  | "planning"
  | "generating"
  | "preparing-diffs"
  | "ready";

export interface ComposerFileAction {
  path: string;
  action: "create" | "update" | "delete";
  reason: string;
  content?: string;
}

export interface ComposerPlan {
  summary: string;
  files: ComposerFileAction[];
  stage: ComposerStage;
}

const COMPOSER_SYSTEM_PROMPT = `You are an advanced AI coding assistant (Composer mode).
When the user gives a high-level task like "Build login page" or "Create auth system", you MUST:

1. First, analyze the workspace structure and project stack.
2. Create a plan listing every file that needs to be created, updated, or deleted—with a brief reason for each.
3. Generate the full code for each file.

Your response MUST be structured as a JSON object with this schema:
{
  "summary": "Brief description of what the plan does",
  "files": [
    {
      "path": "relative/path/to/file.ts",
      "action": "create" | "update" | "delete",
      "reason": "Why this file needs to change",
      "content": "Full file content (for create/update only)"
    }
  ]
}

CRITICAL RULES:
- Always return valid JSON only, with no markdown wrapping or extra text.
- Use the project's detected stack and conventions.
- For "update" actions, include the complete new file content.
- If creating new directories, just create the files — parent directories are created automatically.
- Keep file paths relative to workspace root.
- Use the coding style already in the project.`;

export async function runComposerMode(
  userRequest: string,
  options: {
    signal?: AbortSignal;
    onStageChange?: (stage: ComposerStage) => void;
    onProgress?: (text: string) => void;
    onToolEvent?: (event: ToolExecutionEvent) => void;
  } = {}
): Promise<ComposerPlan> {
  const { onStageChange, onProgress, onToolEvent } = options;

  onStageChange?.("understanding");
  onProgress?.("Scanning workspace…");

  const [context, fileTree, symbols] = await Promise.all([
    getProjectContext(),
    readDirectoryRecursive("", 4, 300),
    indexWorkspaceSymbols(80),
  ]);

  const contextBlock = buildContextBlock(context, fileTree, symbols);

  onStageChange?.("planning");
  onProgress?.("Planning file changes…");

  const messages: ApiChatMessage[] = [
    { role: "system", content: COMPOSER_SYSTEM_PROMPT },
    {
      role: "user",
      content: `## Workspace Context\n${contextBlock}\n\n## User Request\n${userRequest}`,
    },
  ];

  onStageChange?.("generating");
  onProgress?.("Generating code…");

  const result = await runChatWithTools(messages, {
    signal: options.signal,
    onProgress,
    onToolEvent,
    maxRounds: 8,
  });

  onStageChange?.("preparing-diffs");
  onProgress?.("Preparing diffs…");

  const plan = parseComposerResponse(result.lastAssistantText);
  plan.stage = "ready";

  onStageChange?.("ready");
  return plan;
}

function buildContextBlock(
  ctx: ProjectContext,
  files: string[],
  symbols: Array<{ name: string; kind: string; file: string }>
): string {
  const parts: string[] = [];
  parts.push(`**Stack:** ${ctx.summary}`);
  parts.push(`**Files (${files.length}):**\n${files.slice(0, 150).join("\n")}`);

  if (symbols.length > 0) {
    const grouped = new Map<string, string[]>();
    for (const s of symbols.slice(0, 100)) {
      const list = grouped.get(s.file) || [];
      list.push(`${s.kind}: ${s.name}`);
      grouped.set(s.file, list);
    }
    const symbolText = Array.from(grouped.entries())
      .map(([f, syms]) => `  ${f}: ${syms.join(", ")}`)
      .join("\n");
    parts.push(`**Key Symbols:**\n${symbolText}`);
  }

  return parts.join("\n\n");
}

function parseComposerResponse(text: string): ComposerPlan {
  let cleaned = text.trim();
  if (cleaned.startsWith("```")) {
    const first = cleaned.indexOf("\n");
    cleaned = cleaned.slice(first + 1);
    const last = cleaned.lastIndexOf("```");
    if (last > 0) cleaned = cleaned.slice(0, last);
  }

  try {
    const parsed = JSON.parse(cleaned) as {
      summary?: string;
      files?: Array<{
        path?: string;
        action?: string;
        reason?: string;
        content?: string;
      }>;
    };

    return {
      summary: parsed.summary || "Generated plan",
      files: (parsed.files || []).map((f) => ({
        path: f.path || "",
        action: (f.action as "create" | "update" | "delete") || "create",
        reason: f.reason || "",
        content: f.content,
      })),
      stage: "ready",
    };
  } catch {
    return {
      summary: "Failed to parse composer plan — raw response below",
      files: [{
        path: "_composer_raw_response.md",
        action: "create",
        reason: "Raw AI response (parsing failed)",
        content: text,
      }],
      stage: "ready",
    };
  }
}

export async function applyComposerPlan(
  plan: ComposerPlan,
  selectedPaths?: Set<string>
): Promise<{ applied: string[]; skipped: string[]; errors: string[] }> {
  const applied: string[] = [];
  const skipped: string[] = [];
  const errors: string[] = [];
  const root = vscode.workspace.workspaceFolders?.[0]?.uri;
  if (!root) {
    errors.push("No workspace open");
    return { applied, skipped, errors };
  }

  for (const file of plan.files) {
    if (selectedPaths && !selectedPaths.has(file.path)) {
      skipped.push(file.path);
      continue;
    }

    try {
      const uri = vscode.Uri.joinPath(root, file.path);

      if (file.action === "delete") {
        const confirm = await vscode.window.showWarningMessage(
          `Delete ${file.path}?`, { modal: true }, "Delete"
        );
        if (confirm === "Delete") {
          await vscode.workspace.fs.delete(uri);
          applied.push(file.path);
        } else {
          skipped.push(file.path);
        }
        continue;
      }

      if (!file.content) {
        skipped.push(file.path);
        continue;
      }

      const segments = file.path.split("/").filter(Boolean);
      if (segments.length > 1) {
        const parentUri = vscode.Uri.joinPath(root, ...segments.slice(0, -1));
        await vscode.workspace.fs.createDirectory(parentUri);
      }

      await vscode.workspace.fs.writeFile(uri, new TextEncoder().encode(file.content));
      applied.push(file.path);
    } catch (e) {
      errors.push(`${file.path}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  if (applied.length > 0) {
    const first = vscode.Uri.joinPath(root, applied[0]);
    const doc = await vscode.workspace.openTextDocument(first);
    await vscode.window.showTextDocument(doc, { preview: false });
  }

  return { applied, skipped, errors };
}

export function registerComposerCommands(ctx: vscode.ExtensionContext): void {
  ctx.subscriptions.push(
    vscode.commands.registerCommand("asiAssistant.composerMode", async () => {
      const input = await vscode.window.showInputBox({
        title: "Composer Mode",
        placeHolder: "Describe what you want to build (e.g. 'Build login page with auth')",
        prompt: "The AI will plan files, generate code, and let you review before applying.",
      });
      if (!input?.trim()) return;

      const cancel = new AbortController();
      const statusItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
      statusItem.text = "$(sync~spin) Composer: Understanding…";
      statusItem.show();

      try {
        const plan = await runComposerMode(input, {
          signal: cancel.signal,
          onStageChange: (stage) => {
            statusItem.text = `$(sync~spin) Composer: ${stage.replace(/-/g, " ")}…`;
          },
        });

        statusItem.hide();
        statusItem.dispose();

        const items = plan.files.map((f) => ({
          label: `$(${f.action === "create" ? "new-file" : f.action === "delete" ? "trash" : "edit"}) ${f.path}`,
          description: f.action,
          detail: f.reason,
          picked: true,
          filePath: f.path,
        }));

        const selected = await vscode.window.showQuickPick(items, {
          title: `Composer Plan: ${plan.summary}`,
          placeHolder: "Select files to apply",
          canPickMany: true,
        });

        if (!selected?.length) {
          vscode.window.showInformationMessage("Composer: No files selected, plan discarded.");
          return;
        }

        const selectedPaths = new Set(selected.map((s) => s.filePath));
        const result = await applyComposerPlan(plan, selectedPaths);

        const msg = [
          result.applied.length ? `Applied: ${result.applied.length}` : "",
          result.skipped.length ? `Skipped: ${result.skipped.length}` : "",
          result.errors.length ? `Errors: ${result.errors.length}` : "",
        ].filter(Boolean).join(" | ");

        vscode.window.showInformationMessage(`Composer complete. ${msg}`);
      } catch (e) {
        statusItem.hide();
        statusItem.dispose();
        if (cancel.signal.aborted) return;
        vscode.window.showErrorMessage(`Composer error: ${e instanceof Error ? e.message : String(e)}`);
      }
    })
  );
}
