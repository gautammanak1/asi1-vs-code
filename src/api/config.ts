import * as vscode from "vscode";

export function readApiConfig() {
  const config = vscode.workspace.getConfiguration("asiAssistant");
  return {
    url: config.get<string>("baseUrl") ?? "https://api.asi1.ai/v1/chat/completions",
    model: config.get<string>("model") ?? "asi1",
    webSearch: config.get<boolean>("webSearch") !== false,
    agenticSession: config.get<boolean>("agenticSession") === true,
  };
}
