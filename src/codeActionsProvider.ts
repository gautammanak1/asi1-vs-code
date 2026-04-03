import * as vscode from "vscode";

export function registerCodeActionsProvider(
  context: vscode.ExtensionContext
): void {
  const provider = new AsiCodeActionProvider();
  const disposable = vscode.languages.registerCodeActionsProvider(
    { pattern: "**" },
    provider,
    {
      providedCodeActionKinds: AsiCodeActionProvider.providedKinds,
    }
  );
  context.subscriptions.push(disposable);

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "asiAssistant.explainSelection",
      () => openChatWithCommand("explain")
    ),
    vscode.commands.registerCommand(
      "asiAssistant.fixSelection",
      () => openChatWithCommand("fix")
    ),
    vscode.commands.registerCommand(
      "asiAssistant.generateTests",
      () => openChatWithCommand("tests")
    ),
    vscode.commands.registerCommand(
      "asiAssistant.addDocumentation",
      () => openChatWithCommand("doc")
    ),
    vscode.commands.registerCommand(
      "asiAssistant.reviewCode",
      () => openChatWithCommand("review")
    )
  );
}

async function openChatWithCommand(command: string): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showWarningMessage("No active editor.");
    return;
  }

  const selection = editor.selection;
  const code = selection.isEmpty ? "" : editor.document.getText(selection);
  const lang = editor.document.languageId;
  const relPath = vscode.workspace.asRelativePath(editor.document.uri);

  let prompt: string;
  if (code) {
    prompt = `/${command} the selected code from ${relPath}:\n\`\`\`${lang}\n${code}\n\`\`\``;
  } else {
    prompt = `/${command} the active file ${relPath}`;
  }

  if (typeof vscode.chat?.createChatParticipant === "function") {
    await vscode.commands.executeCommand("workbench.action.chat.open", {
      query: `@coder /${command} `,
    });
  } else {
    await vscode.commands.executeCommand("asiAssistant.chatView.focus");
  }
}

class AsiCodeActionProvider implements vscode.CodeActionProvider {
  static readonly providedKinds = [
    vscode.CodeActionKind.QuickFix,
    vscode.CodeActionKind.RefactorRewrite,
  ];

  provideCodeActions(
    document: vscode.TextDocument,
    range: vscode.Range | vscode.Selection,
    context: vscode.CodeActionContext,
    _token: vscode.CancellationToken
  ): vscode.CodeAction[] {
    const actions: vscode.CodeAction[] = [];

    const hasDiagnostics = context.diagnostics.length > 0;
    const hasSelection = !range.isEmpty;

    if (hasDiagnostics) {
      const fixAction = new vscode.CodeAction(
        "Fix with Fetch Coder",
        vscode.CodeActionKind.QuickFix
      );
      fixAction.command = {
        command: "asiAssistant.fixWithDiagnostics",
        title: "Fix with Fetch Coder",
        arguments: [document.uri, range, context.diagnostics],
      };
      fixAction.isPreferred = false;
      actions.push(fixAction);
    }

    if (hasSelection) {
      const explainAction = new vscode.CodeAction(
        "Explain with Fetch Coder",
        vscode.CodeActionKind.RefactorRewrite
      );
      explainAction.command = {
        command: "asiAssistant.explainSelection",
        title: "Explain with Fetch Coder",
      };
      actions.push(explainAction);

      const docAction = new vscode.CodeAction(
        "Document with Fetch Coder",
        vscode.CodeActionKind.RefactorRewrite
      );
      docAction.command = {
        command: "asiAssistant.addDocumentation",
        title: "Document with Fetch Coder",
      };
      actions.push(docAction);
    }

    return actions;
  }
}

export function registerFixWithDiagnostics(
  context: vscode.ExtensionContext
): void {
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "asiAssistant.fixWithDiagnostics",
      async (
        uri: vscode.Uri,
        range: vscode.Range,
        diagnostics: vscode.Diagnostic[]
      ) => {
        const doc = await vscode.workspace.openTextDocument(uri);
        const lang = doc.languageId;
        const relPath = vscode.workspace.asRelativePath(uri);
        const codeRange = expandRangeToFullLines(doc, range, 5);
        const code = doc.getText(codeRange);
        const diagMessages = diagnostics
          .map((d) => `- ${d.message} (${d.source || ""}${d.code ? ` ${d.code}` : ""})`)
          .join("\n");

        const query = [
          `Fix the following issues in ${relPath}:`,
          diagMessages,
          "",
          `\`\`\`${lang}`,
          code,
          "```",
        ].join("\n");

        if (typeof vscode.chat?.createChatParticipant === "function") {
          await vscode.commands.executeCommand("workbench.action.chat.open", {
            query: `@coder /fix ${query}`,
          });
        } else {
          await vscode.commands.executeCommand("asiAssistant.chatView.focus");
        }
      }
    )
  );
}

function expandRangeToFullLines(
  doc: vscode.TextDocument,
  range: vscode.Range,
  contextLines: number
): vscode.Range {
  const startLine = Math.max(0, range.start.line - contextLines);
  const endLine = Math.min(doc.lineCount - 1, range.end.line + contextLines);
  return new vscode.Range(
    startLine,
    0,
    endLine,
    doc.lineAt(endLine).text.length
  );
}
