import { ModelFamily } from "@/shared/prompts"
import { AsiDefaultTool } from "@/shared/tools"
import type { AsiToolSpec } from "../spec"
import { TASK_PROGRESS_PARAMETER } from "../types"

const GENERIC: AsiToolSpec = {
	variant: ModelFamily.GENERIC,
	id: AsiDefaultTool.READ_URL,
	name: "read_url",
	description: `Reads the main readable content of an http(s) URL and returns markdown/plain text (axios + HTML cleanup; headless browser fallback).
- Use when the user pastes a URL or you need the page text without a custom analysis prompt.
- For server-side analysis with a specific question, prefer web_fetch (or MCP) instead.
- Do not ask the user for permission before reading public documentation or article URLs.`,
	contextRequirements: (context) => context.AsiWebToolsEnabled !== false,
	parameters: [
		{
			name: "url",
			required: true,
			instruction: "Fully-qualified http or https URL to fetch",
			usage: "https://example.com/docs",
		},
		TASK_PROGRESS_PARAMETER,
	],
}

const NATIVE_NEXT_GEN: AsiToolSpec = {
	variant: ModelFamily.NATIVE_NEXT_GEN,
	id: AsiDefaultTool.READ_URL,
	name: "read_url",
	description:
		"Reads URL content as markdown/text. Use when the user includes a link or you need article/docs text without a custom prompt.",
	contextRequirements: (context) => context.AsiWebToolsEnabled !== false,
	parameters: [
		{
			name: "url",
			required: true,
			instruction: "URL to read",
		},
		TASK_PROGRESS_PARAMETER,
	],
}

export const read_url_variants = [GENERIC, NATIVE_NEXT_GEN]
