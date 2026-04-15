import { McpServer } from "@shared/mcp";
import { StringRequest } from "@shared/proto/Asi/common";
import { McpDownloadResponse } from "@shared/proto/Asi/mcp";
import axios from "axios";
import { AsiEnv } from "@/config";
import {
	COMPOSIO_MCP_URL,
	SENTRY_HOSTED_MCP_URL,
} from "@/services/mcp/bundledMcpDefaults";
import { getAxiosSettings } from "@/shared/net";
import { Logger } from "@/shared/services/Logger";
import { Controller } from "..";
import { sendChatButtonClickedEvent } from "../ui/subscribeToChatButtonClicked";

/**
 * Download an MCP server from the marketplace
 * @param controller The controller instance
 * @param request The request containing the MCP ID
 * @returns MCP download response with details or error
 */
export async function downloadMcp(
	controller: Controller,
	request: StringRequest,
): Promise<McpDownloadResponse> {
	try {
		// Check if mcpId is provided
		if (!request.value) {
			throw new Error("MCP ID is required");
		}

		const mcpId = request.value;

		// Check if we already have this MCP server installed
		const servers = controller.mcpHub?.getServers() || [];
		const isInstalled = servers.some(
			(server: McpServer) => server.name === mcpId,
		);

		if (isInstalled) {
			throw new Error("This MCP server is already installed");
		}

		// Bundled remote server: add Streamable HTTP entry locally (no marketplace /download API).
		if (mcpId === "composio") {
			await controller.mcpHub.addRemoteServer(
				"composio",
				COMPOSIO_MCP_URL,
				"streamableHttp",
			);
			await controller.postStateToWebview();
			return McpDownloadResponse.create({
				mcpId: "composio",
				githubUrl: "https://github.com/ComposioHQ/composio",
				name: "Composio",
				author: "Composio",
				description: "Composio MCP (Streamable HTTP)",
				readmeContent:
					"The Composio server entry was added to your MCP settings. Save if prompted, then complete OAuth in the browser when connecting.",
				llmsInstallationContent: "",
				requiresApiKey: false,
			});
		}

		if (mcpId === "github-mcp-official") {
			await controller.mcpHub.addStdioServer("github-mcp", {
				command: "npx",
				args: ["-y", "@modelcontextprotocol/server-github"],
			});
			await controller.postStateToWebview();
			return McpDownloadResponse.create({
				mcpId: "github-mcp-official",
				githubUrl: "https://github.com/github/github-mcp-server",
				name: "GitHub (official MCP)",
				author: "GitHub",
				description: "GitHub MCP via @modelcontextprotocol/server-github (stdio)",
				readmeContent:
					"Set GITHUB_PERSONAL_ACCESS_TOKEN in the MCP server env in Asi_mcp_settings.json (or your environment). See https://github.com/github/github-mcp-server",
				llmsInstallationContent: "",
				requiresApiKey: true,
			});
		}

		if (mcpId === "sentry-mcp") {
			await controller.mcpHub.addRemoteServer(
				"sentry",
				SENTRY_HOSTED_MCP_URL,
				"streamableHttp",
			);
			await controller.postStateToWebview();
			return McpDownloadResponse.create({
				mcpId: "sentry-mcp",
				githubUrl: "https://github.com/getsentry/sentry-mcp",
				name: "Sentry MCP",
				author: "Sentry",
				description: "Sentry hosted MCP (Streamable HTTP)",
				readmeContent:
					"Connected to Sentry’s hosted MCP. Complete authentication in the browser when the extension prompts you. Docs: https://github.com/getsentry/sentry-mcp",
				llmsInstallationContent: "",
				requiresApiKey: false,
			});
		}

		if (mcpId === "fetch-agentverse-mcp") {
			await controller.postStateToWebview();
			return McpDownloadResponse.create({
				mcpId: "fetch-agentverse-mcp",
				githubUrl: "https://github.com/fetchai/uAgents",
				name: "Fetch / Agentverse (uAgents)",
				author: "Fetch.ai",
				description: "Pinned shortcut — configure Agentverse/uAgents MCP per Fetch docs",
				readmeContent:
					"Agentverse endpoints are account- and deployment-specific. Follow the latest Fetch.ai / Agentverse documentation to add a streamable HTTP or stdio MCP entry to Asi_mcp_settings.json. Start here: https://fetch.ai/docs and the uAgents repo: https://github.com/fetchai/uAgents",
				llmsInstallationContent:
					"No default public URL is bundled. Add your MCP server block manually after reading Fetch’s current guide.",
				requiresApiKey: false,
			});
		}

		// Fetch server details from marketplace
		const response = await axios.post<McpDownloadResponse>(
			`${AsiEnv.config().mcpBaseUrl}/download`,
			{ mcpId },
			{
				headers: { "Content-Type": "application/json" },
				timeout: 10000,
				...getAxiosSettings(),
			},
		);

		if (!response.data) {
			throw new Error("Invalid response from MCP marketplace API");
		}

		Logger.log("[downloadMcp] Response from download API", { response });

		const mcpDetails = response.data;

		// Validate required fields
		if (!mcpDetails.githubUrl) {
			throw new Error("Missing GitHub URL in MCP download response");
		}
		if (!mcpDetails.readmeContent) {
			throw new Error("Missing README content in MCP download response");
		}

		// Create task with context from README and added guidelines for MCP server installation
		const task = `Set up the MCP server from ${mcpDetails.githubUrl} while adhering to these MCP server installation rules:
- Start by loading the MCP documentation.
- Use "${mcpDetails.mcpId}" as the server name in Asi_mcp_settings.json.
- Create the directory for the new MCP server before starting installation.
- Make sure you read the user's existing Asi_mcp_settings.json file before editing it with this new mcp, to not overwrite any existing servers.
- Use commands aligned with the user's shell and operating system best practices.
- The following README may contain instructions that conflict with the user's OS, in which case proceed thoughtfully.
- Once installed, demonstrate the server's capabilities by using one of its tools.
Here is the project's README to help you get started:\n\n${mcpDetails.readmeContent}\n${mcpDetails.llmsInstallationContent}`;

		const { mode } = await controller.getStateToPostToWebview();
		if (mode === "plan") {
			await controller.togglePlanActMode("act");
		}

		// Initialize task and show chat view
		await controller.initTask(task);
		await sendChatButtonClickedEvent();

		// Return the download details directly
		return McpDownloadResponse.create({
			mcpId: mcpDetails.mcpId,
			githubUrl: mcpDetails.githubUrl,
			name: mcpDetails.name,
			author: mcpDetails.author,
			description: mcpDetails.description,
			readmeContent: mcpDetails.readmeContent,
			llmsInstallationContent: mcpDetails.llmsInstallationContent,
			requiresApiKey: mcpDetails.requiresApiKey,
		});
	} catch (error) {
		Logger.error("Failed to download MCP:", error);
		let errorMessage = "Failed to download MCP";

		if (axios.isAxiosError(error)) {
			if (error.code === "ECONNABORTED") {
				errorMessage = "Request timed out. Please try again.";
			} else if (error.response?.status === 404) {
				errorMessage = "MCP server not found in marketplace.";
			} else if (error.response?.status === 500) {
				errorMessage = "Internal server error. Please try again later.";
			} else if (!error.response && error.request) {
				errorMessage = "Network error. Please check your internet connection.";
			}
		} else if (error instanceof Error) {
			errorMessage = error.message;
		}

		// Return error in the response instead of throwing
		return McpDownloadResponse.create({
			mcpId: "",
			githubUrl: "",
			name: "",
			author: "",
			description: "",
			readmeContent: "",
			llmsInstallationContent: "",
			requiresApiKey: false,
			error: errorMessage,
		});
	}
}
