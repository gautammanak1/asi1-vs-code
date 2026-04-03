import * as vscode from "vscode";

export function registerTerminalCommands(
  context: vscode.ExtensionContext
): void {
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "asiAssistant.terminal.explain",
      () => handleTerminalCommand("explain")
    ),
    vscode.commands.registerCommand(
      "asiAssistant.terminal.fix",
      () => handleTerminalCommand("fix")
    )
  );
}

async function handleTerminalCommand(mode: "explain" | "fix"): Promise<void> {
  const terminal = vscode.window.activeTerminal;
  if (!terminal) {
    vscode.window.showWarningMessage("No active terminal.");
    return;
  }

  const clipboardBefore = await vscode.env.clipboard.readText();
  await vscode.commands.executeCommand(
    "workbench.action.terminal.selectAll"
  );
  await vscode.commands.executeCommand(
    "workbench.action.terminal.copySelection"
  );
  await vscode.commands.executeCommand(
    "workbench.action.terminal.clearSelection"
  );

  await new Promise((r) => setTimeout(r, 150));
  let terminalText = await vscode.env.clipboard.readText();
  await vscode.env.clipboard.writeText(clipboardBefore);

  if (!terminalText || terminalText === clipboardBefore) {
    terminalText = await vscode.window.showInputBox({
      title: `Terminal ${mode === "explain" ? "Explain" : "Fix"}`,
      prompt: "Paste the terminal output or command you want help with",
      placeHolder: "e.g., npm ERR! code ENOENT ...",
    }) || "";
  }

  if (!terminalText.trim()) {
    return;
  }

  const tail = terminalText.length > 4000
    ? terminalText.slice(-4000)
    : terminalText;

  const os = process.platform === "darwin"
    ? "macOS"
    : process.platform === "win32"
      ? "Windows"
      : "Linux";

  const shell = vscode.env.shell || "unknown";

  let prompt: string;
  if (mode === "explain") {
    prompt = [
      `Explain the following terminal output (${os}, ${shell}):`,
      "",
      "```",
      tail,
      "```",
      "",
      "What happened? What do the commands and output mean?",
    ].join("\n");
  } else {
    prompt = [
      `The following terminal output shows an error or problem (${os}, ${shell}):`,
      "",
      "```",
      tail,
      "```",
      "",
      "Identify the issue and provide the exact command(s) to fix it.",
    ].join("\n");
  }

  if (typeof vscode.chat?.createChatParticipant === "function") {
    await vscode.commands.executeCommand("workbench.action.chat.open", {
      query: `@coder ${prompt}`,
    });
  } else {
    await vscode.commands.executeCommand("asiAssistant.chatView.focus");
  }
}
