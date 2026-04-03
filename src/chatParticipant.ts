import * as vscode from "vscode";
import {
  completeChatStreaming,
  runChatWithTools,
  isApiKeyConfigured,
  type ApiChatMessage,
  type ChatMessage,
  type ToolExecutionEvent,
} from "./asiClient";
import { gatherLanguageContext, formatContextForPrompt, getWorkspaceDiagnosticsSummary } from "./languageContext";
import { formatRecentEditsForPrompt } from "./workspaceEditTracker";

const PARTICIPANT_ID = "asiAssistant.coder";

interface SlashCommandConfig {
  systemHint: string;
  buildPrompt: (code: string, lang: string, extra: string) => string;
}

const SLASH_COMMANDS: Record<string, SlashCommandConfig> = {
  explain: {
    systemHint:
      "Explain the code clearly and concisely. Cover what it does, how it works, and any notable patterns or potential issues.",
    buildPrompt: (code, lang, extra) =>
      `Explain this ${lang} code:\n\`\`\`${lang}\n${code}\n\`\`\`${extra ? `\n\n${extra}` : ""}`,
  },
  fix: {
    systemHint:
      "Identify bugs, issues, or improvements. Provide the corrected version with explanations.",
    buildPrompt: (code, lang, extra) =>
      `Fix any issues in this ${lang} code:\n\`\`\`${lang}\n${code}\n\`\`\`${extra ? `\n\n${extra}` : ""}`,
  },
  tests: {
    systemHint:
      "Generate comprehensive unit tests. Use appropriate testing frameworks. Cover edge cases.",
    buildPrompt: (code, lang, extra) =>
      `Generate unit tests for this ${lang} code:\n\`\`\`${lang}\n${code}\n\`\`\`${extra ? `\n\n${extra}` : ""}`,
  },
  doc: {
    systemHint:
      "Generate thorough documentation including parameter descriptions, return values, and usage examples.",
    buildPrompt: (code, lang, extra) =>
      `Add documentation to this ${lang} code:\n\`\`\`${lang}\n${code}\n\`\`\`${extra ? `\n\n${extra}` : ""}`,
  },
  review: {
    systemHint:
      "Review for quality, correctness, performance, security, and best practices. Organize feedback by severity.",
    buildPrompt: (code, lang, extra) =>
      `Review this ${lang} code:\n\`\`\`${lang}\n${code}\n\`\`\`${extra ? `\n\n${extra}` : ""}`,
  },
};

export function registerChatParticipant(context: vscode.ExtensionContext): void {
  if (typeof vscode.chat?.createChatParticipant !== "function") {
    return;
  }

  const handler: vscode.ChatRequestHandler = async (
    request,
    chatContext,
    response,
    token
  ) => {
    const hasKey = await isApiKeyConfigured();
    if (!hasKey) {
      response.markdown(
        "**No API key configured.** Run `ASI: Set API Key` or set `asiAssistant.apiKey` in settings."
      );
      response.button({
        command: "asiAssistant.insertApiKey",
        title: "Set API Key",
      });
      return { metadata: { command: "" } };
    }

    const ac = new AbortController();
    token.onCancellationRequested(() => ac.abort());

    const systemPrompt = buildSystemPrompt(request.command);
    const userPrompt = await buildUserPrompt(request);
    const historyMessages = convertHistory(chatContext);
    const allMessages: ApiChatMessage[] = [
      ...(systemPrompt ? [{ role: "system" as const, content: systemPrompt }] : []),
      ...historyMessages,
      { role: "user" as const, content: userPrompt },
    ];

    const cfg = vscode.workspace.getConfiguration("asiAssistant");
    const useTools = cfg.get<boolean>("enableTools") !== false;
    const webSearch = cfg.get<boolean>("webSearch") !== false;

    try {
      if (useTools) {
        response.progress("Running with workspace tools…");
        const maxRounds = cfg.get<number>("maxToolRounds") ?? 12;
        const { lastAssistantText } = await runChatWithTools(allMessages, {
          signal: ac.signal,
          onProgress: (label) => response.progress(label),
          onToolEvent: (event: ToolExecutionEvent) => {
            if (event.phase === "start") {
              response.progress(`Tool: ${event.name}…`);
            }
          },
          webSearch,
          maxRounds,
        });
        response.markdown(lastAssistantText);
      } else {
        response.progress("Thinking…");
        await completeChatStreaming(
          allMessages as ChatMessage[],
          (delta) => response.markdown(delta),
          ac.signal,
          { webSearch }
        );
      }
    } catch (e) {
      if (ac.signal.aborted) {
        response.markdown("\n\n*Stopped.*");
      } else {
        const msg = e instanceof Error ? e.message : String(e);
        response.markdown(`\n\n**Error:** ${msg}`);
      }
    }

    return { metadata: { command: request.command || "" } };
  };

  const participant = vscode.chat.createChatParticipant(PARTICIPANT_ID, handler);
  participant.iconPath = vscode.Uri.joinPath(
    context.extensionUri,
    "resources",
    "icon.png"
  );
  context.subscriptions.push(participant);
}

function buildSystemPrompt(command?: string): string {
  const base =
    vscode.workspace.getConfiguration("asiAssistant").get<string>("systemPrompt") ||
    "You are a coding assistant in VS Code. Use standard GitHub-flavored markdown with triple-backtick fences and language tags. When editing existing code, show ONLY the changed section with minimal context — do NOT rewrite the entire file for a small change.";

  const commandHint = command ? SLASH_COMMANDS[command]?.systemHint : undefined;
  return commandHint ? `${base.trim()}\n\n${commandHint}` : base;
}

function convertHistory(ctx: vscode.ChatContext): ApiChatMessage[] {
  const msgs: ApiChatMessage[] = [];
  for (const turn of ctx.history) {
    if (turn instanceof vscode.ChatRequestTurn) {
      msgs.push({ role: "user", content: turn.prompt });
    } else if (turn instanceof vscode.ChatResponseTurn) {
      const parts: string[] = [];
      for (const part of turn.response) {
        if (part instanceof vscode.ChatResponseMarkdownPart) {
          parts.push(part.value.value);
        }
      }
      const text = parts.join("");
      if (text) {
        msgs.push({ role: "assistant", content: text });
      }
    }
  }
  return msgs;
}

async function buildUserPrompt(request: vscode.ChatRequest): Promise<string> {
  const refContext = await extractReferenceContext(request.references);
  const commandConfig = request.command
    ? SLASH_COMMANDS[request.command]
    : undefined;

  const editor = vscode.window.activeTextEditor;

  let langContext = "";
  if (editor) {
    try {
      const ctx = await gatherLanguageContext(
        editor.document,
        editor.selection.active
      );
      langContext = formatContextForPrompt(ctx);
    } catch { /* ignore */ }
  }

  const recentEdits = formatRecentEditsForPrompt();
  const diagSummary = await getWorkspaceDiagnosticsSummary();

  const contextParts = [refContext, langContext, recentEdits, diagSummary]
    .filter(Boolean)
    .join("\n\n");

  if (commandConfig) {
    const code = editor && !editor.selection.isEmpty
      ? editor.document.getText(editor.selection)
      : "";
    const lang = editor?.document.languageId || "text";

    if (code) {
      let prompt = commandConfig.buildPrompt(code, lang, request.prompt);
      if (contextParts) {
        prompt = `${contextParts}\n\n${prompt}`;
      }
      return prompt;
    }
  }

  let prompt = request.prompt;
  if (contextParts) {
    prompt = `${contextParts}\n\n${prompt}`;
  }
  return prompt;
}

async function extractReferenceContext(
  references: readonly vscode.ChatPromptReference[]
): Promise<string> {
  const parts: string[] = [];

  for (const ref of references) {
    try {
      if (ref.value instanceof vscode.Uri) {
        const relPath = vscode.workspace.asRelativePath(ref.value);
        const bytes = await vscode.workspace.fs.readFile(ref.value);
        let content = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
        if (content.length > 80_000) {
          content = `${content.slice(0, 80_000)}\n… [truncated]`;
        }
        const ext = relPath.split(".").pop() || "";
        parts.push(`File: ${relPath}\n\`\`\`${ext}\n${content}\n\`\`\``);
      } else if (ref.value instanceof vscode.Location) {
        const relPath = vscode.workspace.asRelativePath(ref.value.uri);
        const doc = await vscode.workspace.openTextDocument(ref.value.uri);
        const code = doc.getText(ref.value.range);
        const lang = doc.languageId;
        const startLine = ref.value.range.start.line + 1;
        const endLine = ref.value.range.end.line + 1;
        parts.push(
          `File: ${relPath} (lines ${startLine}–${endLine})\n\`\`\`${lang}\n${code}\n\`\`\``
        );
      } else if (typeof ref.value === "string") {
        parts.push(ref.value);
      }
    } catch {
      // skip unreadable references
    }
  }

  return parts.join("\n\n");
}
