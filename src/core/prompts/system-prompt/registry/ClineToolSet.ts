import { AgentConfigLoader } from "@core/task/tools/subagent/AgentConfigLoader"
import { Asi_MCP_TOOL_IDENTIFIER, McpServer } from "@/shared/mcp"
import { ModelFamily } from "@/shared/prompts"
import { AsiDefaultTool } from "@/shared/tools"
import { type AsiToolSpec, toolSpecFunctionDeclarations, toolSpecFunctionDefinition, toolSpecInputSchema } from "../spec"
import { PromptVariant, SystemPromptContext } from "../types"

export class AsiToolSet {
	// A list of tools mapped by model group
	private static variants: Map<ModelFamily, Set<AsiToolSet>> = new Map()

	private constructor(
		public readonly id: string,
		public readonly config: AsiToolSpec,
	) {
		this._register()
	}

	public static register(config: AsiToolSpec): AsiToolSet {
		return new AsiToolSet(config.id, config)
	}

	private _register(): void {
		const existingTools = AsiToolSet.variants.get(this.config.variant) || new Set()
		if (!Array.from(existingTools).some((t) => t.config.id === this.config.id)) {
			existingTools.add(this)
			AsiToolSet.variants.set(this.config.variant, existingTools)
		}
	}

	public static getTools(variant: ModelFamily): AsiToolSet[] {
		const toolsSet = AsiToolSet.variants.get(variant) || new Set()
		const defaultSet = AsiToolSet.variants.get(ModelFamily.ASI1) || new Set()

		return toolsSet ? Array.from(toolsSet) : Array.from(defaultSet)
	}

	public static getRegisteredModelIds(): string[] {
		return Array.from(AsiToolSet.variants.keys())
	}

	public static getToolByName(toolName: string, variant: ModelFamily): AsiToolSet | undefined {
		const tools = AsiToolSet.getTools(variant)
		return tools.find((tool) => tool.config.id === toolName)
	}

	// Return a tool by name with fallback to ASI1 and then any other variant where it exists
	public static getToolByNameWithFallback(toolName: string, variant: ModelFamily): AsiToolSet | undefined {
		// Try exact variant first
		const exact = AsiToolSet.getToolByName(toolName, variant)
		if (exact) {
			return exact
		}

		const asi1 = AsiToolSet.getToolByName(toolName, ModelFamily.ASI1)
		if (asi1) {
			return asi1
		}

		// Final fallback: search across all registered variants
		for (const [, tools] of AsiToolSet.variants) {
			const found = Array.from(tools).find((t) => t.config.id === toolName)
			if (found) {
				return found
			}
		}

		return undefined
	}

	// Build a list of tools for a variant using requested ids, falling back to ASI1 when missing
	public static getToolsForVariantWithFallback(variant: ModelFamily, requestedIds: string[]): AsiToolSet[] {
		const resolved: AsiToolSet[] = []
		for (const id of requestedIds) {
			const tool = AsiToolSet.getToolByNameWithFallback(id, variant)
			if (tool) {
				// Avoid duplicates by id
				if (!resolved.some((t) => t.config.id === tool.config.id)) {
					resolved.push(tool)
				}
			}
		}
		return resolved
	}

	public static getEnabledTools(variant: PromptVariant, context: SystemPromptContext): AsiToolSet[] {
		const resolved: AsiToolSet[] = []
		const requestedIds = variant.tools ? [...variant.tools] : []
		for (const id of requestedIds) {
			const tool = AsiToolSet.getToolByNameWithFallback(id, variant.family)
			if (tool) {
				// Avoid duplicates by id
				if (!resolved.some((t) => t.config.id === tool.config.id)) {
					resolved.push(tool)
				}
			}
		}

		// Filter by context requirements
		const enabledTools = resolved.filter(
			(tool) => !tool.config.contextRequirements || tool.config.contextRequirements(context),
		)

		return enabledTools
	}

	private static getDynamicSubagentToolSpecs(variant: PromptVariant, context: SystemPromptContext): AsiToolSpec[] {
		if (context.subagentsEnabled !== true || context.isSubagentRun) {
			return []
		}

		const requestedIds = variant.tools ? [...variant.tools] : []
		const shouldIncludeSubagentTools = requestedIds.length === 0 || requestedIds.includes(AsiDefaultTool.USE_SUBAGENTS)
		if (!shouldIncludeSubagentTools) {
			return []
		}

		const agentConfigs = AgentConfigLoader.getInstance().getAllCachedConfigsWithToolNames()
		return agentConfigs.map(({ toolName, config }) => ({
			variant: variant.family,
			id: AsiDefaultTool.USE_SUBAGENTS,
			name: toolName,
			description: `Use the "${config.name}" subagent: ${config.description}`,
			contextRequirements: (ctx) => ctx.subagentsEnabled === true && !ctx.isSubagentRun,
			parameters: [
				{
					name: "prompt",
					required: true,
					instruction: "Helpful instruction for the task that the subagent will perform.",
				},
			],
		}))
	}

	public static getEnabledToolSpecs(variant: PromptVariant, context: SystemPromptContext): AsiToolSpec[] {
		const registeredTools = AsiToolSet.getEnabledTools(variant, context).map((tool) => tool.config)
		const dynamicSubagentTools = AsiToolSet.getDynamicSubagentToolSpecs(variant, context)

		const includesDynamicSubagents = dynamicSubagentTools.length > 0
		const filteredRegistered = includesDynamicSubagents
			? registeredTools.filter((tool) => tool.id !== AsiDefaultTool.USE_SUBAGENTS)
			: registeredTools

		return [...filteredRegistered, ...dynamicSubagentTools]
	}

	/**
	 * Get the appropriate native tool converter for the given provider
	 */
	public static getNativeConverter(providerId: string, modelId?: string) {
		switch (providerId) {
			case "minimax":
			case "anthropic":
			case "bedrock":
				return toolSpecInputSchema
			case "gemini":
				return toolSpecFunctionDeclarations
			case "vertex":
				if (modelId?.includes("gemini")) {
					return toolSpecFunctionDeclarations
				}
				return toolSpecInputSchema
			default:
				// Default to OpenAI Compatible converter
				return toolSpecFunctionDefinition
		}
	}

	public static getNativeTools(variant: PromptVariant, context: SystemPromptContext) {
		// Only return tool functions if the variant explicitly enables them
		// via the "use_native_tools" label set to 1
		// This avoids exposing tools to models that don't support them
		// or variants that aren't designed for tool use
		if (variant.labels.use_native_tools !== 1 || !context.enableNativeToolCalls) {
			return undefined
		}

		// Base set
		const toolConfigs = AsiToolSet.getEnabledToolSpecs(variant, context)

		// MCP tools
		const mcpServers = context.mcpHub?.getServers()?.filter((s) => s.disabled !== true) || []
		const mcpTools = mcpServers?.flatMap((server) => mcpToolToAsiToolSpec(variant.family, server))

		const enabledTools = [...toolConfigs, ...mcpTools].filter(
			(tool) => typeof tool.description === "string" && tool.description.trim().length > 0,
		)
		const converter = AsiToolSet.getNativeConverter(context.providerInfo.providerId, context.providerInfo.model.id)

		return enabledTools.map((tool) => converter(tool, context))
	}
}

/**
 * Convert an MCP server's tools to AsiToolSpec format
 */
export function mcpToolToAsiToolSpec(family: ModelFamily, server: McpServer): AsiToolSpec[] {
	const tools = server.tools || []
	return tools
		.map((mcpTool) => {
			let parameters: any[] = []

			if (mcpTool.inputSchema && "properties" in mcpTool.inputSchema) {
				const schema = mcpTool.inputSchema as any
				const requiredFields = new Set(schema.required || [])

				parameters = Object.entries(schema.properties as Record<string, any>).map(([name, propSchema]) => {
					// Preserve the full schema, not just basic fields
					const param: any = {
						name,
						instruction: propSchema.description || "",
						type: propSchema.type || "string",
						required: requiredFields.has(name),
					}

					// Preserve items for array types
					if (propSchema.items) {
						param.items = propSchema.items
					}

					// Preserve properties for object types
					if (propSchema.properties) {
						param.properties = propSchema.properties
					}

					// Preserve other JSON Schema fields (enum, format, minimum, maximum, etc.)
					for (const key in propSchema) {
						if (!["type", "description", "items", "properties"].includes(key)) {
							param[key] = propSchema[key]
						}
					}

					return param
				})
			}

			const mcpToolName = server.uid + Asi_MCP_TOOL_IDENTIFIER + mcpTool.name

			// NOTE: When the name is too long, the provider API will reject the tool registration with the following error:
			// `Invalid 'tools[n].name': string too long. Expected a string with maximum length 64, but got a string with length n instead.`
			// To avoid this, we skip registering tools with names that are too long.
			if (mcpToolName?.length <= 64) {
				return {
					variant: family,
					id: AsiDefaultTool.MCP_USE,
					// We will use the identifier to reconstruct the MCP server and tool name later
					name: mcpToolName,
					description: `${server.name}: ${mcpTool.description || mcpTool.name}`,
					parameters,
				}
			}

			return undefined
		})
		.filter((t) => t !== undefined)
}
