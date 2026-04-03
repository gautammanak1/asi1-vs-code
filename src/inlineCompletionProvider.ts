import * as vscode from "vscode";
import { completeChat, isApiKeyConfigured, type ChatMessage } from "./asiClient";
import { gatherLanguageContext, formatContextForPrompt } from "./languageContext";

const MAX_PREFIX_LINES = 60;
const MAX_SUFFIX_LINES = 20;

let debounceTimer: ReturnType<typeof setTimeout> | undefined;
let inflightAbort: AbortController | undefined;

export function registerInlineCompletionProvider(
  context: vscode.ExtensionContext
): vscode.Disposable {
  const provider: vscode.InlineCompletionItemProvider = {
    async provideInlineCompletionItems(
      document: vscode.TextDocument,
      position: vscode.Position,
      _ctx: vscode.InlineCompletionContext,
      token: vscode.CancellationToken
    ): Promise<vscode.InlineCompletionItem[] | undefined> {
      const cfg = vscode.workspace.getConfiguration("asiAssistant");
      if (cfg.get<boolean>("inlineCompletion.enabled") !== true) {
        return undefined;
      }
      const hasKey = await isApiKeyConfigured();
      if (!hasKey) {
        return undefined;
      }

      const delay = cfg.get<number>("inlineCompletion.debounceMs") ?? 400;
      await debounce(delay, token);
      if (token.isCancellationRequested) {
        return undefined;
      }

      const prefix = getPrefix(document, position);
      const suffix = getSuffix(document, position);
      if (prefix.trim().length < 3) {
        return undefined;
      }

      const lang = document.languageId;
      const fileName = vscode.workspace.asRelativePath(document.uri);

      const langCtx = await gatherLanguageContext(document, position);
      const contextInfo = formatContextForPrompt(langCtx);

      const diagnosticHint = langCtx.diagnostics.length
        ? `\nActive diagnostics:\n${langCtx.diagnostics.slice(0, 5).map(d => `  ${d.severity}: ${d.message} (L${d.range.startLine})`).join("\n")}`
        : "";

      const messages: ChatMessage[] = [
        {
          role: "system",
          content: [
            "You are a code completion engine. Given the code prefix, suffix, and file context,",
            "output ONLY the code that should be inserted at the cursor position.",
            "Do NOT repeat the prefix or suffix. Do NOT wrap in markdown fences.",
            "Do NOT add explanations. Output raw code only.",
            "Consider imports, diagnostics, and code patterns already in the file.",
          ].join(" "),
        },
        {
          role: "user",
          content: [
            contextInfo,
            diagnosticHint,
            "",
            "PREFIX:",
            prefix,
            "",
            "SUFFIX:",
            suffix,
            "",
            "Complete the code at the cursor. Output ONLY the insertion:",
          ].join("\n"),
        },
      ];

      try {
        if (inflightAbort) {
          inflightAbort.abort();
        }
        const ac = new AbortController();
        inflightAbort = ac;
        const onCancel = token.onCancellationRequested(() => ac.abort());

        const result = await completeChat(messages, ac.signal, {
          webSearch: false,
        });

        onCancel.dispose();

        if (token.isCancellationRequested || !result.content.trim()) {
          return undefined;
        }

        let text = result.content;
        if (text.startsWith("```")) {
          const lines = text.split("\n");
          lines.shift();
          if (lines[lines.length - 1]?.trim() === "```") {
            lines.pop();
          }
          text = lines.join("\n");
        }

        text = text.trimEnd();
        if (!text) {
          return undefined;
        }

        return [
          new vscode.InlineCompletionItem(
            text,
            new vscode.Range(position, position)
          ),
        ];
      } catch {
        return undefined;
      }
    },
  };

  const disposable = vscode.languages.registerInlineCompletionItemProvider(
    { pattern: "**" },
    provider
  );
  context.subscriptions.push(disposable);

  const toggleCmd = vscode.commands.registerCommand(
    "asiAssistant.toggleInlineCompletion",
    async () => {
      const cfg = vscode.workspace.getConfiguration("asiAssistant");
      const current = cfg.get<boolean>("inlineCompletion.enabled") === true;
      await cfg.update(
        "inlineCompletion.enabled",
        !current,
        vscode.ConfigurationTarget.Global
      );
      vscode.window.showInformationMessage(
        `Fetch Coder inline completions: ${!current ? "enabled" : "disabled"}`
      );
    }
  );
  context.subscriptions.push(toggleCmd);

  return disposable;
}

function getPrefix(
  doc: vscode.TextDocument,
  pos: vscode.Position
): string {
  const startLine = Math.max(0, pos.line - MAX_PREFIX_LINES);
  const range = new vscode.Range(startLine, 0, pos.line, pos.character);
  return doc.getText(range);
}

function getSuffix(
  doc: vscode.TextDocument,
  pos: vscode.Position
): string {
  const endLine = Math.min(doc.lineCount - 1, pos.line + MAX_SUFFIX_LINES);
  const range = new vscode.Range(
    pos.line,
    pos.character,
    endLine,
    doc.lineAt(endLine).text.length
  );
  return doc.getText(range);
}

function debounce(ms: number, token: vscode.CancellationToken): Promise<void> {
  return new Promise<void>((resolve) => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
    debounceTimer = setTimeout(resolve, ms);
    const d = token.onCancellationRequested(() => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
      d.dispose();
      resolve();
    });
  });
}
