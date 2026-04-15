export interface FetchChatTemplate {
	id: string
	title: string
	description: string
	body: string
}

export const FETCH_CHAT_TEMPLATES: FetchChatTemplate[] = [
	{
		id: "uagent-basic",
		title: "uAgent Creator",
		description: "Basic Python uAgent with message handlers",
		body: `Create a minimal Fetch.ai uAgent in Python for this workspace.

Requirements:
- Use the official uAgents SDK patterns; include agent name, port, and a short README section on how to run (\`pip install\` / poetry as appropriate).
- Add at least two handlers (e.g. ping/pong or a simple message schema) with clear docstrings.
- Note how this would register on Agentverse or connect to ASI:One when the user adds credentials (placeholders only, no secrets).

Start by inspecting the repo structure, then add files under a sensible package path.`,
	},
	{
		id: "agentverse-reg",
		title: "Agentverse Registration",
		description: "Steps and boilerplate to register an agent",
		body: `Outline how to register and expose this project’s agent on Agentverse.

Include:
- Prerequisites (wallet, Almanac, identity) at a high level — no real keys.
- What metadata and endpoints Agentverse typically expects.
- A checklist the user can follow in the Agentverse UI, tied to the code we have in this repo.

Use @file: and @folder: mentions if you need project-specific paths.`,
	},
	{
		id: "asi-one-api",
		title: "ASI:One API integration",
		description: "Template for calling ASI:One from app code",
		body: `Help integrate ASI:One API calls into this codebase.

- Find existing HTTP/client patterns and match them.
- Use environment variables for the API key; never hardcode secrets.
- Add a small, testable client wrapper and one example call with error handling.

If the project already has ASI:One config, extend it rather than duplicating.`,
	},
	{
		id: "multi-agent",
		title: "Multi-agent communication",
		description: "Agent Chat Protocol (official uAgents pattern)",
		body: `Implement multi-agent messaging using ONLY the official Fetch.ai **Agent Chat Protocol** (ACP) as documented — do not invent a separate "chat proto" or parallel protocol.

Authoritative reference: https://innovationlab.fetch.ai/resources/docs/agent-communication/agent-chat-protocol

Requirements (strict):
- Import and use \`chat_protocol_spec\` from \`uagents_core.contrib.protocols.chat\` (or the current documented import path in the installed uagents version). Wire handlers with \`Protocol(spec=chat_protocol_spec)\` and \`include(..., publish_manifest=True)\` on each agent.
- Use \`ChatMessage\`, \`ChatAcknowledgement\`, and \`TextContent\` from the same module tree as in the official docs — do not substitute ad-hoc JSON/protobuf "chat" schemas.
- Implement the flow: inbound ChatMessage → send ChatAcknowledgement promptly → optional follow-up ChatMessage reply, as in the docs.
- If the repo already has agent code, extend it to match ACP instead of adding a second, duplicate chat layer.

Use @file: mentions for existing agent modules in this repo.`,
	},
]
