import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";
import { registerApiKeyFromExtensionFile, registerApiKeySecret } from "./asiClient";
import { ChatViewProvider } from "./chatViewProvider";
import { registerChatParticipant } from "./chatParticipant";
import { registerInlineCompletionProvider } from "./inlineCompletionProvider";
import {
  registerCodeActionsProvider,
  registerFixWithDiagnostics,
} from "./codeActionsProvider";
import { registerInlineEditCommand } from "./inlineEditCommand";
import { registerTerminalCommands } from "./terminalHelper";
import { registerMultiFileEditCommands } from "./multiFileEditManager";
import { registerRequestLoggerCommands } from "./requestLogger";
import { startTrackingEdits } from "./workspaceEditTracker";
import { setExtensionPath } from "./workspaceFiles";
import { registerWorkspaceCommands } from "./workspaceCommands";
import { registerComposerCommands } from "./composerMode";
import { registerAuditCommands } from "./security/auditLogger";
import { registerChatExportCommand } from "./chatExport";
import { registerGitCommands } from "./gitCommands";
import { registerScaffoldingCommands } from "./scaffolding";
import { registerCustomInstructionsCommands } from "./customInstructions";
import { registerFetchaiCommands } from "./fetchaiIntegration";

const SECRET_KEY = "asiAssistant.storedApiKey";

export function activate(context: vscode.ExtensionContext): void {
  setExtensionPath(context.extensionPath);
  registerApiKeySecret(() => context.secrets.get(SECRET_KEY));
  registerApiKeyFromExtensionFile(() => {
    try {
      const filePath = path.join(context.extensionPath, ".api-key");
      if (fs.existsSync(filePath)) {
        return fs.readFileSync(filePath, "utf8").trim();
      }
    } catch {
      /* ignore */
    }
    return undefined;
  });

  // --- Sidebar webview chat (existing) ---
  const provider = new ChatViewProvider(context);

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(ChatViewProvider.viewType, provider)
  );

  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration("asiAssistant")) {
        void provider.refreshSetupState();
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("asiAssistant.openChat", async () => {
      await vscode.commands.executeCommand("asiAssistant.chatView.focus");
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("asiAssistant.openChatPanel", () => {
      provider.openAsPanel();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("asiAssistant.insertApiKey", async () => {
      const key = await vscode.window.showInputBox({
        title: "ASI1 API Key",
        password: true,
        placeHolder: "Paste your API key",
        ignoreFocusOut: true,
      });
      if (key === undefined) {
        return;
      }
      await context.secrets.store(SECRET_KEY, key);
      vscode.window.showInformationMessage("ASI API key saved securely for this workspace profile.");
      void provider.refreshSetupState();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("asiAssistant.installFromVsix", async () => {
      const uris = await vscode.window.showOpenDialog({
        canSelectMany: false,
        openLabel: "Install",
        filters: { "Extension VSIX": ["vsix"] },
        title: "Install ASI1 Code from .vsix file",
      });
      if (!uris?.length) {
        return;
      }
      try {
        await vscode.commands.executeCommand("workbench.extensions.installExtensionFromVSIX", [
          uris[0],
        ]);
        vscode.window.showInformationMessage(
          "VSIX install started. Reload the window if prompted."
        );
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        vscode.window.showErrorMessage(`Could not install VSIX: ${msg}`);
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("asiAssistant.askAboutSelection", async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showWarningMessage("No active editor.");
        return;
      }
      const sel = editor.selection;
      const text = editor.document.getText(sel.isEmpty ? undefined : sel);
      const chunk = text || editor.document.getText();
      if (!chunk.trim()) {
        vscode.window.showWarningMessage("No text to send.");
        return;
      }
      const question = await vscode.window.showInputBox({
        title: "Ask ASI about this code",
        prompt: "Optional question (or leave empty to ask for review/summary)",
        value: "Explain and suggest improvements:",
      });
      if (question === undefined) {
        return;
      }
      await vscode.commands.executeCommand("asiAssistant.chatView.focus");
      const prompt = [
        "Context (editor selection or file):",
        "```",
        chunk.slice(0, 120_000),
        "```",
        "",
        question || "Summarize and suggest improvements.",
      ].join("\n");
      provider.appendUserMessageAndRun(prompt);
    })
  );

  // --- Native VS Code Chat Participant ---
  registerChatParticipant(context);

  // --- Inline Completions (ghost text) ---
  registerInlineCompletionProvider(context);

  // --- AI Code Actions (quick fix, explain, doc) ---
  registerCodeActionsProvider(context);
  registerFixWithDiagnostics(context);

  // --- Inline Edit (Cmd+I / Ctrl+I) ---
  registerInlineEditCommand(context);

  // --- Terminal Explain / Fix ---
  registerTerminalCommands(context);

  // --- Multi-File Edit Manager ---
  registerMultiFileEditCommands(context);

  // --- Advanced Workspace Editing (diff preview, revert, live decorations) ---
  registerWorkspaceCommands(context);

  // --- Composer Mode ---
  registerComposerCommands(context);

  // --- Audit Logger ---
  registerAuditCommands(context);

  // --- Chat Export ---
  registerChatExportCommand(context, provider);

  // --- Git AI Commands (commit messages, PR generation) ---
  registerGitCommands(context);

  // --- Project Scaffolding ---
  registerScaffoldingCommands(context);

  // --- Custom Instructions / Memory ---
  registerCustomInstructionsCommands(context);

  // --- Fetch.ai Agent Integration ---
  registerFetchaiCommands(context);

  // --- Request Logger (debug/inspect AI API calls) ---
  registerRequestLoggerCommands(context);

  // --- Workspace Edit Tracker (recent user edits for context) ---
  startTrackingEdits(context);

  // --- Background Workspace Indexing ---
  setTimeout(async () => {
    try {
      const { getProjectContext, indexWorkspaceSymbols } = await import("./contextIndexer");
      await getProjectContext();
      await indexWorkspaceSymbols(80);
    } catch { /* non-critical */ }
  }, 3000);
}

export function deactivate(): void {}
