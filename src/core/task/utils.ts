import { ApiHandler } from "@core/api"
import { execSync } from "child_process"
import { showApprovalNotification } from "@/integrations/notifications"
import { AsiApiReqCancelReason, AsiApiReqInfo } from "@/shared/ExtensionMessage"
import { MessageStateHandler } from "./message-state"

export const showNotificationForApproval = (message: string, notificationsEnabled: boolean) => {
	void showApprovalNotification({ message }, notificationsEnabled)
}

type UpdateApiReqMsgParams = {
	messageStateHandler: MessageStateHandler
	lastApiReqIndex: number
	inputTokens: number
	outputTokens: number
	cacheWriteTokens: number
	cacheReadTokens: number
	totalCost?: number
	api: ApiHandler
	cancelReason?: AsiApiReqCancelReason
	streamingFailedMessage?: string
}

export const updateApiReqMsg = async (params: UpdateApiReqMsgParams) => {
	const AsiMessages = params.messageStateHandler.getAsiMessages()
	const currentApiReqInfo: AsiApiReqInfo = JSON.parse(AsiMessages[params.lastApiReqIndex].text || "{}")
	delete currentApiReqInfo.retryStatus

	await params.messageStateHandler.updateAsiMessage(params.lastApiReqIndex, {
		text: JSON.stringify({
			...currentApiReqInfo,
			tokensIn: params.inputTokens,
			tokensOut: params.outputTokens,
			cacheWrites: params.cacheWriteTokens,
			cacheReads: params.cacheReadTokens,
			cost: 0,
			cancelReason: params.cancelReason,
			streamingFailedMessage: params.streamingFailedMessage,
		} satisfies AsiApiReqInfo),
	})
}

/**
 * Common CLI tools that developers frequently use
 */
const CLI_TOOLS = [
	"gh",
	"git",
	"docker",
	"podman",
	"kubectl",
	"aws",
	"gcloud",
	"az",
	"terraform",
	"pulumi",
	"npm",
	"yarn",
	"pnpm",
	"pip",
	"cargo",
	"go",
	"curl",
	"jq",
	"make",
	"cmake",
	"python",
	"node",
	"psql",
	"mysql",
	"redis-cli",
	"sqlite3",
	"mongosh",
	"code",
	"grep",
	"sed",
	"awk",
	"brew",
	"apt",
	"yum",
	"gradle",
	"mvn",
	"bundle",
	"dotnet",
	"helm",
	"ansible",
	"wget",
]

/**
 * Detect which CLI tools are available in the system PATH
 * Uses 'which' command on Unix-like systems and 'where' on Windows
 */
export async function detectAvailableCliTools(): Promise<string[]> {
	const availableCommands: string[] = []
	const isWindows = process.platform === "win32"
	const checkCommand = isWindows ? "where" : "which"

	for (const command of CLI_TOOLS) {
		try {
			// Use execSync to check if the command exists
			execSync(`${checkCommand} ${command}`, {
				stdio: "ignore", // Don't output to console
				timeout: 1000, // 1 second timeout to avoid hanging
			})
			availableCommands.push(command)
		} catch (error) {
			// Command not found, skip it
		}
	}

	return availableCommands
}

/**
 * Extracts the domain from a provider URL string
 * @param url The URL to extract domain from
 * @returns The domain/hostname or undefined if invalid
 */
export function extractProviderDomainFromUrl(url: string | undefined): string | undefined {
	if (!url) {
		return undefined
	}
	try {
		const urlObj = new URL(url)
		return urlObj.hostname
	} catch {
		return undefined
	}
}
