import { ModelFamily } from "@/shared/prompts"
import { AsiDefaultTool } from "@/shared/tools"
import type { AsiToolSpec } from "../spec"
import { TASK_PROGRESS_PARAMETER } from "../types"

const ASI1: AsiToolSpec = {
	variant: ModelFamily.ASI1,
	id: AsiDefaultTool.MCP_ACCESS,
	name: "access_mcp_resource",
	description:
		"Request to access a resource provided by a connected MCP server. Resources represent data sources that can be used as context, such as files, API responses, or system information.",
	contextRequirements: (context) => context.mcpHub !== undefined && context.mcpHub !== null,
	parameters: [
		{
			name: "server_name",
			required: true,
			instruction: "The name of the MCP server providing the resource",
			usage: "server name here",
		},
		{
			name: "uri",
			required: true,
			instruction: "The URI identifying the specific resource to access",
			usage: "resource URI here",
		},
		TASK_PROGRESS_PARAMETER,
	],
}

export const access_mcp_resource_variants = [ASI1]
