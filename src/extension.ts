import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";
import { registerApiKeyFromExtensionFile, registerApiKeySecret } from "./asiClient";
import { ChatViewProvider } from "./chatViewProvider";

const SECRET_KEY = "asiAssistant.storedApiKey";

export function activate(context: vscode.ExtensionContext): void {
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
}

export function deactivate(): void {}
