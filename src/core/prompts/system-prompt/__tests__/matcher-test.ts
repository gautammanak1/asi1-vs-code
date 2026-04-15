/**
 * Test to verify matcher-based variant selection for the single ASI:One prompt
 */

import { ApiProviderInfo } from "@/core/api"
import { McpHub } from "@/services/mcp/McpHub"
import { ModelFamily } from "@/shared/prompts"
import { SystemPromptContext } from "../types"
import { VARIANT_CONFIGS } from "../variants"

const mockProviderInfos: { name: string; providerInfo: ApiProviderInfo; expectedFamily: ModelFamily }[] = [
	{
		name: "ASI:One default",
		providerInfo: {
			providerId: "openai",
			model: { id: "asi1-mini", info: {} as any },
			mode: "act" as const,
		},
		expectedFamily: ModelFamily.ASI1,
	},
	{
		name: "Other model id (still ASI:One product)",
		providerInfo: {
			providerId: "openai",
			model: { id: "gpt-3.5-turbo", info: {} as any },
			mode: "act" as const,
		},
		expectedFamily: ModelFamily.ASI1,
	},
]

export function testVariantMatching() {
	console.log("🧪 Testing variant matching logic...")

	for (const { name, providerInfo, expectedFamily } of mockProviderInfos) {
		console.log(`\n📝 Testing: ${name}`)
		console.log(`   Model: ${providerInfo.model.id}`)
		console.log(`   Provider: ${providerInfo.providerId}`)
		console.log(`   Custom Prompt: ${providerInfo.customPrompt || "none"}`)
		console.log(`   Expected Family: ${expectedFamily}`)

		let matchedFamily: ModelFamily | null = null

		for (const [familyId, config] of Object.entries(VARIANT_CONFIGS)) {
			const mockContext = {
				cwd: "/test/project",
				ide: "TestIde",
				supportsBrowserUse: true,
				mcpHub: {
					getServers: () => [
						{
							name: "test-server",
							status: "connected",
							config: '{"command": "test"}',
							tools: [
								{
									name: "test_tool",
									description: "A test tool",
									inputSchema: { type: "object", properties: {} },
								},
							],
							resources: [],
							resourceTemplates: [],
						},
					],
				} as unknown as McpHub,
				focusChainSettings: {
					enabled: true,
					remindAsiInterval: 6,
				},
				browserSettings: {
					viewport: {
						width: 1280,
						height: 720,
					},
				},
				globalAsiRulesFileInstructions: "Follow global rules",
				localAsiRulesFileInstructions: "Follow local rules",
				preferredLanguageInstructions: "Prefer TypeScript",
				isTesting: true,
				enableNativeToolCalls: false,
				providerInfo,
			} satisfies SystemPromptContext

			try {
				if (config.matcher(mockContext)) {
					matchedFamily = familyId as ModelFamily
					console.log(`   ✅ Matched: ${familyId}`)
					break
				}
			} catch (error) {
				console.log(`   ❌ Matcher error for ${familyId}: ${error}`)
			}
		}

		if (matchedFamily === expectedFamily) {
			console.log(`   🎯 PASS: Correctly matched ${expectedFamily}`)
		} else {
			console.log(`   🚨 FAIL: Expected ${expectedFamily}, got ${matchedFamily || "null"}`)
		}
	}

	console.log("\n✨ Variant matching test completed!")
}

export { mockProviderInfos }
