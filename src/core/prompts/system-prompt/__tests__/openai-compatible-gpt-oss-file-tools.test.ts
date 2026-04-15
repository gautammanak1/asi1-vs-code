import { expect } from "chai"
import { beforeEach, describe, it } from "mocha"
import type { ApiProviderInfo } from "@/core/api"
import { ModelFamily } from "@/shared/prompts"
import { AsiDefaultTool } from "@/shared/tools"
import { getSystemPrompt } from "../index"
import { PromptRegistry } from "../registry/PromptRegistry"
import type { SystemPromptContext } from "../types"

const makeContext = (modelId: string): SystemPromptContext => ({
	cwd: "/test/project",
	ide: "TestIde",
	supportsBrowserUse: true,
	AsiWebToolsEnabled: true,
	focusChainSettings: { enabled: true, remindAsiInterval: 6 },
	browserSettings: { viewport: { width: 1280, height: 720 } },
	isTesting: true,
	enableNativeToolCalls: true,
	providerInfo: {
		providerId: "openai-compatible",
		model: { id: modelId, info: { supportsPromptCache: false } as any },
		mode: "act",
	} satisfies ApiProviderInfo,
})

const toolNamesFrom = (tools: Awaited<ReturnType<typeof getSystemPrompt>>["tools"]): string[] =>
	(tools ?? [])
		.map((tool: any) => tool?.function?.name ?? tool?.name)
		.filter((name): name is string => typeof name === "string")

describe("ASI:One / generic prompt variant (native tools)", () => {
	beforeEach(() => {
		PromptRegistry.dispose()
	})

	it("resolves to the single generic model family", async () => {
		const registry = PromptRegistry.getInstance()
		await registry.load()
		const family = registry.getModelFamily(makeContext("asi1-mini"))
		expect(family).to.equal(ModelFamily.ASI1)
	})

	it("exposes core tools for OpenAI-compatible ASI models", async () => {
		const { tools } = await getSystemPrompt(makeContext("asi1-mini"))
		const toolNames = toolNamesFrom(tools)

		expect(toolNames).to.include(AsiDefaultTool.BASH)
		expect(toolNames).to.include(AsiDefaultTool.FILE_READ)
		expect(toolNames.length).to.be.greaterThan(0)
	})
})
