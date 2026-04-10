import type { PromptVariant, SystemPromptContext } from "../types"

const FETCHAI_KNOWLEDGE = `FETCH.AI REFERENCE — use ONLY when the user explicitly mentions Fetch.ai, uAgents, Agentverse, ASI:One API, or blockchain agents. For ALL other requests (HTML, CSS, JS, React, Next.js, Python, Go, games, landing pages, CLI tools, etc.) ignore this section entirely and write the code the user asks for.

If the user asks about Fetch.ai topics, refer to these docs and patterns:

- uAgents (Python microservices): pip install uagents — https://innovationlab.fetch.ai/resources/docs/agent-creation/uagent-creation
- Agent communication: on_message, ctx.send, ctx.send_and_receive — https://innovationlab.fetch.ai/resources/docs/agent-communication/uagent-uagent-communication
- Agent Chat Protocol: ChatMessage, ChatAcknowledgement, TextContent from uagents_core.contrib.protocols.chat — https://innovationlab.fetch.ai/resources/docs/agent-communication/agent-chat-protocol
- Payment Protocol: RequestPayment, CommitPayment from uagents_core.contrib.protocols.payment — https://innovationlab.fetch.ai/resources/docs/agent-transaction/agent-payment-protocol
- Agentverse deployment: https://agentverse.ai — hosted agents, mailbox agents (mailbox=True), local agents
- ASI:One API: POST https://api.asi1.ai/v1/chat/completions, model: asi1, supports web_search: true — https://innovationlab.fetch.ai/resources/docs/asione/asi1-getting-started
- ASI:One image generation: POST https://api.asi1.ai/v1/image/generate, model: asi1-mini
- MCP integration with uAgents: https://innovationlab.fetch.ai/resources/docs/mcp-integration/what-is-mcp
- FetchCoder CLI: npm install -g @fetchai/fetchcoder — https://innovationlab.fetch.ai/resources/docs/fetchcoder/overview
- Full docs: https://innovationlab.fetch.ai/resources/docs/intro`

export async function getFetchAiKnowledgeSection(_variant: PromptVariant, _context: SystemPromptContext): Promise<string> {
	return FETCHAI_KNOWLEDGE
}
