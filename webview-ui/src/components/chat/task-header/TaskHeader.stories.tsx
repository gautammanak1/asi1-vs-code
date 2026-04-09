import { AsiMessage } from "@shared/ExtensionMessage"
import type { Meta, StoryObj } from "@storybook/react-vite"
import { createStorybookDecorator } from "@/config/StorybookDecorator"
import TaskHeader from "./TaskHeader"

const meta: Meta<typeof TaskHeader> = {
	title: "Views/Components/TaskHeader",
	component: TaskHeader,
	parameters: {
		layout: "padded",
		docs: {
			description: {
				component: "TaskHeader displays task information and provides controls for task management.",
			},
		},
	},
	decorators: [createStorybookDecorator()],
}

export default meta
type Story = StoryObj<typeof TaskHeader>

const createTask = (text: string, images?: string[], files?: string[]): AsiMessage => ({
	ts: Date.now(),
	type: "say",
	say: "task",
	text,
	images,
	files,
})

export const Collapsed: Story = {
	args: {
		task: createTask("Create a responsive navigation component for a React application"),
		onClose: () => console.log("Close clicked"),
	},
	decorators: [
		createStorybookDecorator({
			expandTaskHeader: false,
			apiConfiguration: {
				actModeApiProvider: "openai",
				actModeOpenAiModelId: "asi1",
			},
		}),
	],
}

export const Expanded: Story = {
	args: {
		task: createTask("Create a responsive navigation component for a React application"),
		onClose: () => console.log("Close clicked"),
	},
	decorators: [
		createStorybookDecorator({
			expandTaskHeader: true,
			apiConfiguration: {
				actModeApiProvider: "openai",
				actModeOpenAiModelId: "asi1",
			},
		}),
	],
}

export const WithImages: Story = {
	args: {
		task: createTask(
			"Analyze these screenshots and identify UI issues",
			["https://via.placeholder.com/400x300?text=Screenshot1", "https://via.placeholder.com/400x300?text=Screenshot2"],
			undefined,
		),
		onClose: () => console.log("Close clicked"),
	},
	decorators: [
		createStorybookDecorator({
			expandTaskHeader: true,
			apiConfiguration: {
				actModeApiProvider: "openai",
				actModeOpenAiModelId: "asi1",
			},
		}),
	],
}

export const LongTask: Story = {
	args: {
		task: createTask(
			"Implement a comprehensive user authentication system with the following features: email/password login, social auth (Google, GitHub), two-factor authentication, password reset flow, session management, rate limiting, and audit logging. The system should follow OWASP security guidelines and include proper error handling, input validation, and secure password hashing using bcrypt. Additionally, create comprehensive unit tests and integration tests for all authentication flows.",
		),
		onClose: () => console.log("Close clicked"),
	},
	decorators: [
		createStorybookDecorator({
			expandTaskHeader: true,
			apiConfiguration: {
				actModeApiProvider: "openai",
				actModeOpenAiModelId: "asi1",
			},
		}),
	],
}
