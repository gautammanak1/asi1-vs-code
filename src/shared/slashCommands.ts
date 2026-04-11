export interface SlashCommand {
	name: string
	description?: string
	section?: "default" | "custom" | "mcp" | "fetch-coder"
	cliCompatible?: boolean
	/** Inserted after `/{name} ` when the user picks the command from the menu */
	prefillAfterSlash?: string
}

/** Fetch Coder quick prompts (expanded on the server via explicit_instructions) */
export const FETCH_CODER_SLASH_COMMANDS: SlashCommand[] = [
	{
		name: "fix",
		description: "Fix selected code or described issue",
		section: "fetch-coder",
		prefillAfterSlash: "Describe the issue or paste error output. Use @file:path to attach files.\n",
	},
	{
		name: "test",
		description: "Generate unit tests for selected code",
		section: "fetch-coder",
		prefillAfterSlash: "What should be covered? Mention the module or @file: paths.\n",
	},
	{
		name: "docs",
		description: "Generate JSDoc/docstring documentation",
		section: "fetch-coder",
		prefillAfterSlash: "Which symbols or files should be documented? @file:…\n",
	},
	{
		name: "explain",
		description: "Explain selected code in simple terms",
		section: "fetch-coder",
		prefillAfterSlash: "What part should we focus on? @file:… or describe the selection.\n",
	},
	{
		name: "review",
		description: "Do a code review with suggestions",
		section: "fetch-coder",
		prefillAfterSlash: "Scope: PR, folder, or @file:… — note any concerns.\n",
	},
	{
		name: "agent",
		description: "Create a Fetch.ai uAgent boilerplate",
		section: "fetch-coder",
		prefillAfterSlash: "Language/runtime (e.g. Python 3.11) and integration targets (Agentverse, ASI:One).\n",
	},
	{
		name: "deploy",
		description: "Generate deployment instructions",
		section: "fetch-coder",
		prefillAfterSlash: "Target environment (Docker, K8s, cloud) and constraints.\n",
	},
	{
		name: "refactor",
		description: "Refactor selected code",
		section: "fetch-coder",
		prefillAfterSlash: "Goal of the refactor and any files: @file:… @folder:…\n",
	},
]

export const BASE_SLASH_COMMANDS: SlashCommand[] = [
	{
		name: "newtask",
		description: "Create a new task with context from the current task",
		section: "default",
		cliCompatible: true,
	},
	{
		name: "deep-planning",
		description: "Create a comprehensive implementation plan before coding",
		section: "default",
		cliCompatible: true,
	},
	{
		name: "smol",
		description: "Condenses your current context window",
		section: "default",
		cliCompatible: true,
	},
	{
		name: "newrule",
		description: "Create a new Asi rule based on your conversation",
		section: "default",
		cliCompatible: true,
	},
	{
		name: "reportbug",
		description: "Create a Github issue with Asi",
		section: "default",
		cliCompatible: true,
	},
]

// VS Code-only slash commands
export const VSCODE_ONLY_COMMANDS: SlashCommand[] = [
	{
		name: "explain-changes",
		description: "Explain code changes between git refs (PRs, commits, branches, etc.)",
		section: "default",
	},
]

// CLI-only slash commands (handled locally, not sent to backend)
export const CLI_ONLY_COMMANDS: SlashCommand[] = [
	{
		name: "help",
		description: "Learn how to use Asi CLI",
		section: "default",
		cliCompatible: true,
	},
	{
		name: "settings",
		description: "Change API provider, auto-approve, and feature settings",
		section: "default",
		cliCompatible: true,
	},
	{
		name: "models",
		description: "Change the model used for the current mode",
		section: "default",
		cliCompatible: true,
	},
	{
		name: "history",
		description: "Browse and search task history",
		section: "default",
		cliCompatible: true,
	},
	{
		name: "clear",
		description: "Clear the current task and start fresh",
		section: "default",
		cliCompatible: true,
	},
	{
		name: "exit",
		description: "Alternative to Ctrl+C",
		section: "default",
		cliCompatible: true,
	},
	{
		name: "q",
		description: "Alternative to Ctrl+C",
		section: "default",
		cliCompatible: true,
	},
	{
		name: "skills",
		description: "View and manage installed skills",
		section: "default",
		cliCompatible: true,
	},
]
