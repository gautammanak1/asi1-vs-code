export interface QuickWinTask {
	id: string
	title: string
	description: string
	icon?: string
	actionCommand: string
	prompt: string
	buttonText?: string
}

export const quickWinTasks: QuickWinTask[] = [
	{
		id: "create_uagent",
		title: "Create a uAgent",
		description: "Build a Fetch.ai uAgent with message handling and Agentverse registration",
		icon: "RobotIcon",
		actionCommand: "Asi/createUAgent",
		prompt: "Create a Fetch.ai uAgent project using the uagents Python framework. Include a virtual environment setup, requirements.txt with uagents, a basic agent with startup and message handlers, and a README explaining how to run it. Use port 8000 and include a typed data model for messages.",
		buttonText: ">",
	},
	{
		id: "agent_chat_protocol",
		title: "Agent Chat Protocol",
		description: "Set up two agents communicating via the Fetch.ai Chat Protocol",
		icon: "ChatIcon",
		actionCommand: "Asi/createChatAgents",
		prompt: "Create two Fetch.ai uAgents that communicate using the Agent Chat Protocol (ChatMessage, ChatAcknowledgement, TextContent from uagents_core.contrib.protocols.chat). Agent 1 sends a message on startup, Agent 2 receives and replies. Include requirements.txt, .env.example, and a README with run instructions.",
		buttonText: ">",
	},
	{
		id: "asi_one_app",
		title: "ASI:One API App",
		description: "Build a Python app powered by the ASI:One LLM API",
		icon: "BrainIcon",
		actionCommand: "Asi/createAsiOneApp",
		prompt: "Create a Python application that uses the ASI:One API (https://api.asi1.ai/v1/chat/completions, model: asi1) with streaming support. Include a simple CLI interface where the user can chat with ASI:One. Use the requests library. Include requirements.txt, .env.example for the API key, and a README.",
		buttonText: ">",
	},
	{
		id: "nextjs_app",
		title: "Build a Web App",
		description: "Create a modern Next.js app with Tailwind CSS styling",
		icon: "WebAppIcon",
		actionCommand: "Asi/createNextJsApp",
		prompt: "Create a beautiful Next.js web application with Tailwind CSS. Set up the basic project structure with a clean landing page, responsive navigation, and a simple interactive feature. Make it modern and visually appealing.",
		buttonText: ">",
	},
]
