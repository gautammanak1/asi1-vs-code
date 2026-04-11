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
		body: `Help integrate ASI:One  API calls into this codebase.

- Find existing HTTP/client patterns and match them.
- Use environment variables for the API key; never hardcode secrets.
- Add a small, testable client wrapper and one example call with error handling.

If the project already has ASI:One config, extend it rather than duplicating.`,
	},
	{
		id: "multi-agent",
		title: "Multi-agent communication",
		description: "Coordinate multiple agents or services",
		body: `Design a concise multi-agent communication approach for this project.

Cover:
- Roles of each agent and the message format between them.
- How to avoid duplicate work and conflicting state.
- Testing strategy (integration vs mocked agents).

Reference relevant files with @file: where useful.`,
	},
]
