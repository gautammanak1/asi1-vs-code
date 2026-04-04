import * as vscode from "vscode";
import { completeChat, type ChatMessage } from "./asiClient";

const FETCHAI_DOCS_URL = "https://innovationlab.fetch.ai/resources/docs/intro";
const AGENTVERSE_URL = "https://agentverse.ai";

const AGENT_SYSTEM_PROMPT = `You are an expert on the Fetch.ai ecosystem, uAgents framework, ASI:One LLM, and Agentverse.
You help developers build AI agents, connect them to Agentverse, and use blockchain transactions.

Key concepts:
- uAgents: Microservices that connect with other agents (APIs, ML models, services)
- Agentverse: Agent marketplace for registration, deployment, and discovery
- ASI:One: Web3-native LLM for agentic AI
- Agents communicate via secure messages and transact on blockchain

Documentation: ${FETCHAI_DOCS_URL}
Agentverse: ${AGENTVERSE_URL}

When generating agent code, use the uagents Python SDK.
Always include proper imports, message handlers, and registration.`;

export function registerFetchaiCommands(ctx: vscode.ExtensionContext): void {
  ctx.subscriptions.push(
    vscode.commands.registerCommand("asiAssistant.fetchaiAgent", async () => {
      const options = [
        { label: "Create uAgent", description: "Generate a new Fetch.ai agent", id: "create" },
        { label: "Agent Communication", description: "Setup agent-to-agent messaging", id: "comm" },
        { label: "Agentverse Deploy", description: "Deploy agent to Agentverse", id: "deploy" },
        { label: "Agent Transaction", description: "Add blockchain transactions", id: "tx" },
        { label: "MCP Integration", description: "Connect agent with MCP server", id: "mcp" },
        { label: "Multi-Agent System", description: "Orchestrate multiple agents", id: "multi" },
        { label: "Docs Lookup", description: "Search Fetch.ai documentation", id: "docs" },
      ];

      const choice = await vscode.window.showQuickPick(options, {
        title: "Fetch.ai Agent Tools",
        placeHolder: "What do you want to build?",
      });

      if (!choice) return;

      let userPrompt: string;
      if (choice.id === "docs") {
        const query = await vscode.window.showInputBox({
          title: "Fetch.ai Docs",
          placeHolder: "What do you want to know about?",
        });
        if (!query) return;
        userPrompt = `Look up Fetch.ai documentation about: ${query}. Provide a clear explanation with code examples.`;
      } else {
        const detail = await vscode.window.showInputBox({
          title: choice.label,
          placeHolder: "Describe what you want to build…",
          prompt: choice.description,
        });
        if (!detail) return;
        userPrompt = `${choice.description}: ${detail}`;
      }

      const statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
      statusBar.text = "$(sync~spin) Generating Fetch.ai agent code…";
      statusBar.show();

      try {
        const messages: ChatMessage[] = [
          { role: "system", content: AGENT_SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ];

        const result = await completeChat(messages);
        const doc = await vscode.workspace.openTextDocument({
          content: result.content,
          language: "markdown",
        });
        await vscode.window.showTextDocument(doc, { preview: false });
      } catch (e) {
        vscode.window.showErrorMessage(
          `Fetch.ai error: ${e instanceof Error ? e.message : String(e)}`
        );
      } finally {
        statusBar.dispose();
      }
    }),

    vscode.commands.registerCommand("asiAssistant.fetchaiDocs", async () => {
      vscode.env.openExternal(vscode.Uri.parse(FETCHAI_DOCS_URL));
    }),

    vscode.commands.registerCommand("asiAssistant.fetchaiAgentverse", async () => {
      vscode.env.openExternal(vscode.Uri.parse(AGENTVERSE_URL));
    })
  );
}
