import type { StringRequest } from "@shared/proto/Asi/common";
import { KeyValuePair } from "@shared/proto/Asi/common";
import * as vscode from "vscode";
import { Logger } from "@/shared/services/Logger";
import type { Controller } from "../index";

/**
 * Runs a shell command in a new VS Code terminal (used from ProtoBus UI service).
 */
export async function executeTerminalCommand(
	_controller: Controller,
	request: StringRequest,
): Promise<KeyValuePair> {
	const command = request.value?.trim() ?? "";
	if (!command) {
		return KeyValuePair.create({
			key: "error",
			value: "empty_command",
		});
	}

	try {
		const terminal = vscode.window.createTerminal({
			name: "Fetch Coder",
			iconPath: new vscode.ThemeIcon("sparkle"),
			env: {
				Asi_ACTIVE: "true",
			},
		});
		terminal.show();
		terminal.sendText(command, true);

		return KeyValuePair.create({
			key: "success",
			value: "executed",
		});
	} catch (error) {
		Logger.error("executeTerminalCommand failed:", error);
		return KeyValuePair.create({
			key: "error",
			value: error instanceof Error ? error.message : String(error),
		});
	}
}
