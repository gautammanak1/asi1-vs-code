import type { PromptVariant, SystemPromptContext } from "../types"
import {
	FETCHAI_CURSOR_RULES_BODY,
	FETCHAI_KNOWLEDGE_BODY,
} from "./fetchai_knowledge.generated"

/**
 * Full Fetch.ai prompt bundle (Cursor development rules + Innovation Lab excerpt), built by
 * scripts/build-fetchai-knowledge.mjs. Use ONLY for uAgents / Agentverse / ASI:One / Fetch agent work.
 */
const FETCHAI_KNOWLEDGE_HEADER = `=== FETCH.AI / UAGENTS — FULL BUNDLE (use only for uAgent / Agentverse / Fetch agent tasks) ===

## When to apply
If the user wants Python uAgents, Agentverse, agent-to-agent messaging, Chat Protocol, adapters, Fetch SDK, LangGraph/CrewAI/MCP with uAgents, or ASI:One: follow **Section A (Cursor rules)** first for versions, pitfalls, and patterns, then **Section B (Innovation Lab excerpts)** for doc-aligned examples. For unrelated coding, omit this entire block.

## Doc index
https://innovationlab.fetch.ai/resources/docs/intro

---

## Section A — Fetch.ai development rules (Cursor rules bundle)

`

const FETCHAI_SECTION_B = `

---

## Section B — Innovation Lab documentation bundle (truncated)

`

export async function getFetchAiKnowledgeSection(_variant: PromptVariant, _context: SystemPromptContext): Promise<string> {
	return (
		FETCHAI_KNOWLEDGE_HEADER +
		FETCHAI_CURSOR_RULES_BODY +
		FETCHAI_SECTION_B +
		FETCHAI_KNOWLEDGE_BODY
	)
}
