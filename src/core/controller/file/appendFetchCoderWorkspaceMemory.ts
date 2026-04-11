import { appendFetchCoderWorkspaceMemoryEntry } from "@core/memory/fetchCoderWorkspaceMemory";
import { Empty, StringRequest } from "@shared/proto/Asi/common";
import { ShowMessageType } from "@/shared/proto/host/window";
import { Logger } from "@/shared/services/Logger";
import { getCwd, getDesktopDir } from "@/utils/path";
import { Controller } from "..";
import { HostProvider } from "@/hosts/host-provider";

/**
 * Appends a remembered fact to `.fetch-coder/memory.md` at the workspace root.
 */
export async function appendFetchCoderWorkspaceMemory(
	_controller: Controller,
	request: StringRequest,
): Promise<Empty> {
	const text = request.value?.trim();
	if (!text) {
		return Empty.create();
	}

	try {
		const cwd = await getCwd(getDesktopDir());
		if (!cwd) {
			HostProvider.window.showMessage({
				type: ShowMessageType.WARNING,
				message: "No workspace folder open — could not save memory.",
			});
			return Empty.create();
		}
		await appendFetchCoderWorkspaceMemoryEntry(cwd, text);
		HostProvider.window.showMessage({
			type: ShowMessageType.INFORMATION,
			message: "Saved to .fetch-coder/memory.md",
		});
	} catch (e) {
		const msg = e instanceof Error ? e.message : String(e);
		Logger.error("appendFetchCoderWorkspaceMemory:", msg);
		HostProvider.window.showMessage({
			type: ShowMessageType.ERROR,
			message: `Could not save workspace memory: ${msg}`,
		});
	}

	return Empty.create();
}
