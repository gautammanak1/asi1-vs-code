import * as vscode from "vscode";

const STORAGE_KEY = "asiAssistant.customInstructions";

let _instructions: string[] = [];

export function getCustomInstructions(): string[] {
  return _instructions;
}

export function getCustomInstructionsPrompt(): string {
  if (!_instructions.length) return "";
  return `\n\nUser's Custom Instructions (always follow these):\n${_instructions.map((r, i) => `${i + 1}. ${r}`).join("\n")}`;
}

export function registerCustomInstructionsCommands(ctx: vscode.ExtensionContext): void {
  _instructions = ctx.globalState.get<string[]>(STORAGE_KEY) ?? [];

  ctx.subscriptions.push(
    vscode.commands.registerCommand("asiAssistant.editCustomInstructions", async () => {
      const current = _instructions.join("\n");
      const doc = await vscode.workspace.openTextDocument({
        content: current || "# Custom Instructions\n# One rule per line. These are always sent to the AI.\n# Examples:\n# Always use TypeScript\n# Always use Tailwind CSS\n# Prefer functional components\n# Use async/await\n# Use shadcn/ui components\n",
        language: "markdown",
      });
      const editor = await vscode.window.showTextDocument(doc, { preview: false });

      const disposable = vscode.workspace.onDidCloseTextDocument((closed) => {
        if (closed === doc) {
          const text = doc.getText();
          _instructions = text
            .split("\n")
            .map((l) => l.trim())
            .filter((l) => l && !l.startsWith("#"));
          ctx.globalState.update(STORAGE_KEY, _instructions);
          disposable.dispose();
          vscode.window.showInformationMessage(
            `Saved ${_instructions.length} custom instructions.`
          );
        }
      });
    }),

    vscode.commands.registerCommand("asiAssistant.addCustomInstruction", async () => {
      const rule = await vscode.window.showInputBox({
        title: "Add Custom Instruction",
        placeHolder: "e.g. Always use TypeScript with strict mode",
      });
      if (!rule?.trim()) return;
      _instructions.push(rule.trim());
      await ctx.globalState.update(STORAGE_KEY, _instructions);
      vscode.window.showInformationMessage(`Added: "${rule.trim()}"`);
    }),

    vscode.commands.registerCommand("asiAssistant.clearCustomInstructions", async () => {
      const confirm = await vscode.window.showWarningMessage(
        `Clear all ${_instructions.length} custom instructions?`,
        { modal: true },
        "Clear"
      );
      if (confirm !== "Clear") return;
      _instructions = [];
      await ctx.globalState.update(STORAGE_KEY, _instructions);
      vscode.window.showInformationMessage("Custom instructions cleared.");
    })
  );
}
