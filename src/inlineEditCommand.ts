import * as vscode from "vscode";
import {
  completeChatStreaming,
  isApiKeyConfigured,
  type ChatMessage,
} from "./asiClient";
import { gatherLanguageContext, formatContextForPrompt } from "./languageContext";

export function registerInlineEditCommand(
  context: vscode.ExtensionContext
): void {
  context.subscriptions.push(
    vscode.commands.registerCommand("asiAssistant.inlineEdit", async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showWarningMessage("No active editor.");
        return;
      }

      const hasKey = await isApiKeyConfigured();
      if (!hasKey) {
        vscode.window.showWarningMessage(
          "No API key configured. Run 'ASI: Set API Key' first."
        );
        return;
      }

      const selection = editor.selection;
      const hasSelection = !selection.isEmpty;
      const lang = editor.document.languageId;
      const relPath = vscode.workspace.asRelativePath(editor.document.uri);

      const selectedCode = hasSelection
        ? editor.document.getText(selection)
        : "";

      const contextRange = getContextAroundCursor(editor);
      const contextCode = editor.document.getText(contextRange);

      const instruction = await vscode.window.showInputBox({
        title: hasSelection
          ? "Fetch Coder: Edit Selection"
          : "Fetch Coder: Generate Code at Cursor",
        prompt: hasSelection
          ? "Describe how to change the selected code"
          : "Describe what code to generate",
        placeHolder: hasSelection
          ? "e.g., Add error handling, refactor to async/await"
          : "e.g., Add a function that validates email addresses",
      });

      if (instruction === undefined || !instruction.trim()) {
        return;
      }

      const messages = await buildInlineEditMessages(
        editor,
        lang,
        relPath,
        selectedCode,
        contextCode,
        instruction,
        hasSelection
      );

      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: "Fetch Coder",
          cancellable: true,
        },
        async (progress, token) => {
          const ac = new AbortController();
          token.onCancellationRequested(() => ac.abort());

          progress.report({ message: "Generating code…" });

          try {
            const result = await completeChatStreaming(
              messages,
              () => {},
              ac.signal,
              { webSearch: false }
            );

            if (token.isCancellationRequested) {
              return;
            }

            let newCode = extractCodeFromResponse(result.content);
            if (!newCode.trim()) {
              vscode.window.showWarningMessage("No code generated.");
              return;
            }

            if (hasSelection) {
              const edit = new vscode.WorkspaceEdit();
              edit.replace(editor.document.uri, selection, newCode);
              await vscode.workspace.applyEdit(edit);
              vscode.window.showInformationMessage(
                "Code applied. Use Ctrl+Z / Cmd+Z to undo."
              );
            } else {
              const edit = new vscode.WorkspaceEdit();
              edit.insert(
                editor.document.uri,
                editor.selection.active,
                newCode
              );
              await vscode.workspace.applyEdit(edit);
              vscode.window.showInformationMessage(
                "Code inserted. Use Ctrl+Z / Cmd+Z to undo."
              );
            }
          } catch (e) {
            if (!ac.signal.aborted) {
              const msg = e instanceof Error ? e.message : String(e);
              vscode.window.showErrorMessage(`Fetch Coder: ${msg}`);
            }
          }
        }
      );
    })
  );
}

async function buildInlineEditMessages(
  editor: vscode.TextEditor,
  lang: string,
  filePath: string,
  selectedCode: string,
  contextCode: string,
  instruction: string,
  isEdit: boolean
): Promise<ChatMessage[]> {
  let langContextInfo = "";
  try {
    const langCtx = await gatherLanguageContext(
      editor.document,
      editor.selection.active
    );
    langContextInfo = formatContextForPrompt(langCtx);
  } catch { /* ignore */ }

  const system: ChatMessage = {
    role: "system",
    content: isEdit
      ? [
          "You are a MINIMAL code editor. The user shows selected code and an instruction.",
          "CRITICAL RULES:",
          "1. Make ONLY the specific change requested — do NOT rewrite unrelated lines.",
          "2. If the user asks to change 1 line, change ONLY that 1 line and keep everything else EXACTLY the same.",
          "3. Preserve all existing formatting, variable names, comments, and logic that are NOT part of the requested change.",
          "4. Output the COMPLETE selected code block with ONLY the minimal edit applied, inside a single fenced code block.",
          "5. Do NOT add explanations, comments about what you changed, or extra improvements the user didn't ask for.",
          "6. Do NOT reorganize, reformat, or 'improve' code beyond what was explicitly requested.",
        ].join("\n")
      : [
          "You are a code generator. The user provides context and an instruction.",
          "Output ONLY the new code to insert, inside a single fenced code block.",
          "Do NOT include surrounding context code — only the new code.",
          "Keep it minimal and targeted. Do NOT add explanations.",
        ].join("\n"),
  };

  let userContent: string;
  if (isEdit) {
    userContent = [
      langContextInfo ? langContextInfo + "\n" : "",
      "Selected code to edit:",
      `\`\`\`${lang}`,
      selectedCode,
      "```",
      "",
      `Instruction: ${instruction}`,
      "",
      "Return the selected code with ONLY the requested change applied. Do NOT rewrite the whole thing.",
    ].join("\n");
  } else {
    userContent = [
      langContextInfo ? langContextInfo + "\n" : "",
      "Context around cursor:",
      `\`\`\`${lang}`,
      contextCode,
      "```",
      "",
      `Instruction: ${instruction}`,
    ].join("\n");
  }

  return [system, { role: "user", content: userContent }];
}

function extractCodeFromResponse(response: string): string {
  const fenceMatch = response.match(/```[\w]*\n([\s\S]*?)```/);
  if (fenceMatch) {
    return fenceMatch[1].replace(/\n$/, "");
  }
  return response.trim();
}

function getContextAroundCursor(editor: vscode.TextEditor): vscode.Range {
  const doc = editor.document;
  const pos = editor.selection.active;
  const startLine = Math.max(0, pos.line - 30);
  const endLine = Math.min(doc.lineCount - 1, pos.line + 15);
  return new vscode.Range(
    startLine,
    0,
    endLine,
    doc.lineAt(endLine).text.length
  );
}
