import * as vscode from "vscode";
import { registerDiffProviders } from "./diffPreview";
import {
  revertLastChange,
  revertFile,
  revertAllPending,
  showRevertPicker,
} from "./revertManager";
import {
  writeFileWithPreview,
  writeFilesWithPreview,
  deleteFileWithConfirmation,
  renameFileWithConfirmation,
  readDirectoryRecursive,
} from "./workspaceManager";
import { fileHistory } from "./fileHistory";

export function registerWorkspaceCommands(
  context: vscode.ExtensionContext
): void {
  registerDiffProviders(context);

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "asiAssistant.previewWorkspaceEdit",
      async (args: {
        files: { relativePath: string; content: string }[];
        description?: string;
      }) => {
        if (!args?.files?.length) {
          vscode.window.showWarningMessage("No files to preview.");
          return;
        }
        await writeFilesWithPreview(args.files, args.description);
      }
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "asiAssistant.applyWorkspaceEdit",
      async (args: {
        relativePath: string;
        content: string;
        skipPreview?: boolean;
      }) => {
        if (!args?.relativePath || typeof args.content !== "string") {
          vscode.window.showWarningMessage("Missing file path or content.");
          return;
        }
        await writeFileWithPreview(
          { relativePath: args.relativePath, content: args.content },
          args.skipPreview
        );
      }
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "asiAssistant.rejectWorkspaceEdit",
      () => {
        vscode.window.showInformationMessage("Workspace edit rejected.");
      }
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "asiAssistant.revertLastChange",
      async () => {
        await revertLastChange();
      }
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "asiAssistant.revertFileChange",
      async () => {
        const input = await vscode.window.showInputBox({
          title: "Revert File",
          prompt: "Enter relative path of the file to revert",
          placeHolder: "src/index.ts",
        });
        if (input) {
          await revertFile(input.trim());
        }
      }
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "asiAssistant.revertAllChanges",
      async () => {
        await revertAllPending();
      }
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "asiAssistant.showWorkspaceChanges",
      async () => {
        await showRevertPicker();
      }
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "asiAssistant.deleteFile",
      async (args: { relativePath: string }) => {
        if (!args?.relativePath) return;
        await deleteFileWithConfirmation(args.relativePath);
      }
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "asiAssistant.renameFile",
      async (args: { fromPath: string; toPath: string }) => {
        if (!args?.fromPath || !args?.toPath) return;
        await renameFileWithConfirmation(args.fromPath, args.toPath);
      }
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "asiAssistant.scanWorkspace",
      async () => {
        try {
          const files = await readDirectoryRecursive("", 5, 200);
          const items = files.map((f) => ({
            label: f,
            description: "",
          }));
          const pick = await vscode.window.showQuickPick(items, {
            title: "Workspace Files",
            placeHolder: `${files.length} file(s) found`,
          });
          if (pick) {
            const root = vscode.workspace.workspaceFolders?.[0]?.uri;
            if (root) {
              const uri = vscode.Uri.joinPath(root, pick.label);
              const doc = await vscode.workspace.openTextDocument(uri);
              await vscode.window.showTextDocument(doc);
            }
          }
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          vscode.window.showErrorMessage(`Scan failed: ${msg}`);
        }
      }
    )
  );
}
