import * as vscode from "vscode";

interface ExportableMessage {
  role: string;
  content: string;
}

export function registerChatExportCommand(
  ctx: vscode.ExtensionContext,
  provider: { getHistory(): ExportableMessage[] }
): void {
  ctx.subscriptions.push(
    vscode.commands.registerCommand("asiAssistant.exportChat", async () => {
      const format = await vscode.window.showQuickPick(
        [
          { label: "Markdown", description: "Export as .md", id: "md" },
          { label: "JSON", description: "Export as .json", id: "json" },
        ],
        { title: "Export Chat" }
      );
      if (!format) return;

      const history = provider.getHistory();
      if (!history.length) {
        vscode.window.showInformationMessage("No chat history to export.");
        return;
      }

      const content = format.id === "json"
        ? exportAsJson(history)
        : exportAsMarkdown(history);

      const ext = format.id === "json" ? "json" : "md";
      const uri = await vscode.window.showSaveDialog({
        defaultUri: vscode.Uri.file(`chat-export-${Date.now()}.${ext}`),
        filters: format.id === "json"
          ? { JSON: ["json"] }
          : { Markdown: ["md"] },
      });

      if (!uri) return;
      await vscode.workspace.fs.writeFile(uri, new TextEncoder().encode(content));
      vscode.window.showInformationMessage(`Chat exported to ${uri.fsPath}`);
    })
  );
}

function exportAsMarkdown(msgs: ExportableMessage[]): string {
  const lines: string[] = [
    `# Chat Export`,
    `*Exported: ${new Date().toISOString()}*`,
    "",
  ];

  for (const m of msgs) {
    if (m.role === "user") {
      lines.push(`## User\n\n${m.content}\n`);
    } else if (m.role === "assistant") {
      lines.push(`## Assistant\n\n${m.content}\n`);
    } else {
      lines.push(`## ${m.role}\n\n${m.content}\n`);
    }
  }

  return lines.join("\n");
}

function exportAsJson(msgs: ExportableMessage[]): string {
  return JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      messages: msgs.map((m) => ({ role: m.role, content: m.content })),
    },
    null,
    2
  );
}
