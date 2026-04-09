import { Empty, StringRequest } from "@shared/proto/asi/common"
import * as vscode from "vscode"

const Asi_OUTPUT_CHANNEL = vscode.window.createOutputChannel("Asi")

// Appends a log message to all Asi output channels.
export async function debugLog(request: StringRequest): Promise<Empty> {
	Asi_OUTPUT_CHANNEL.appendLine(request.value)
	return Empty.create({})
}

// Register the Asi output channel within the VSCode extension context.
export function registerAsiOutputChannel(context: vscode.ExtensionContext): vscode.OutputChannel {
	context.subscriptions.push(Asi_OUTPUT_CHANNEL)
	return Asi_OUTPUT_CHANNEL
}
