export enum NEW_USER_TYPE {
	FREE = "free",
	POWER = "power",
	BYOK = "byok",
}

type UserTypeSelection = {
	title: string
	description: string
	type: NEW_USER_TYPE
}

export const STEP_CONFIG = {
	0: {
		title: "How will you use Fetch Coder?",
		description: "Connect with your ASI:One API key to continue.",
		buttons: [{ text: "Continue", action: "next", variant: "default" }],
	},
	[NEW_USER_TYPE.FREE]: {
		title: "Select a free model",
		buttons: [
			{ text: "Continue", action: "next", variant: "default" },
			{ text: "Back", action: "back", variant: "secondary" },
		],
	},
	[NEW_USER_TYPE.POWER]: {
		title: "Select your model",
		buttons: [
			{ text: "Continue", action: "next", variant: "default" },
			{ text: "Back", action: "back", variant: "secondary" },
		],
	},
	[NEW_USER_TYPE.BYOK]: {
		title: "Configure ASI:One",
		description: "Enter your API key. Base URL and model should match your ASI:One project.",
		buttons: [
			{ text: "Continue", action: "done", variant: "default" },
			{ text: "Back", action: "back", variant: "secondary" },
		],
	},
	2: {
		title: "Almost there!",
		description: "Finish configuration in the previous step.",
		buttons: [{ text: "Back", action: "back", variant: "secondary" }],
	},
} as const

export const USER_TYPE_SELECTIONS: UserTypeSelection[] = [
	{
		title: "ASI:One API key",
		description: "Bearer token from your ASI:One / Fetch.ai developer access",
		type: NEW_USER_TYPE.BYOK,
	},
]
