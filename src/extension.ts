import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";
import { scaffoldAgentverseProject } from "./agentverseScaffold";
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

  context.subscriptions.push(
    vscode.commands.registerCommand("asiAssistant.createAgentverseAgent", async () => {
      const displayName = await vscode.window.showInputBox({
        title: "Agentverse uAgent (Fetch.ai)",
        prompt: "Display name for the agent (a folder with a slug name will be created)",
        placeHolder: "e.g. My Fetch Assistant",
        validateInput: (v) => (v.trim() ? "" : "Enter a name"),
      });
      if (!displayName?.trim()) {
        return;
      }

      let parent: vscode.Uri | undefined;
      const wf = vscode.workspace.workspaceFolders?.[0];
      if (wf) {
        type ParentPick = vscode.QuickPickItem & { folder?: vscode.Uri };
        const pick = await vscode.window.showQuickPick<ParentPick>(
          [
            {
              label: "$(folder) Workspace root",
              description: wf.uri.fsPath,
              folder: wf.uri,
            },
            {
              label: "$(folder-opened) Choose another folder…",
              description: "Pick a parent directory",
            },
          ],
          { placeHolder: "Where should the project folder be created?" }
        );
        if (!pick) {
          return;
        }
        if (pick.folder) {
          parent = pick.folder;
        } else {
          const dirs = await vscode.window.showOpenDialog({
            canSelectFolders: true,
            canSelectMany: false,
            openLabel: "Select parent folder",
          });
          parent = dirs?.[0];
        }
      } else {
        const dirs = await vscode.window.showOpenDialog({
          canSelectFolders: true,
          canSelectMany: false,
          openLabel: "Select parent folder for the agent project",
        });
        parent = dirs?.[0];
      }
      if (!parent) {
        return;
      }

      try {
        const projectDir = await scaffoldAgentverseProject(context.extensionUri, {
          displayName,
          parentFolder: parent,
        });
        const revealLabel =
          process.platform === "win32"
            ? "Reveal in File Explorer"
            : process.platform === "darwin"
              ? "Reveal in Finder"
              : "Show in file manager";
        const choice = await vscode.window.showInformationMessage(
          `Created uAgent project (uAgents + chat protocol) at ${projectDir.fsPath}`,
          "Open in new window",
          revealLabel
        );
        if (choice === "Open in new window") {
          await vscode.commands.executeCommand("vscode.openFolder", projectDir, true);
        } else if (choice === revealLabel) {
          await vscode.commands.executeCommand("revealFileInOS", projectDir);
        }
      } catch (e) {
        if (e instanceof Error && e.message === "Cancelled") {
          return;
        }
        vscode.window.showErrorMessage(e instanceof Error ? e.message : String(e));
      }
    })
  );
}

export function deactivate(): void {}
