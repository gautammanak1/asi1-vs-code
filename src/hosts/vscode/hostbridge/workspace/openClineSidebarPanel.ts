import * as vscode from "vscode"
import { ExtensionRegistryInfo } from "@/registry"
import { OpenAsiSidebarPanelRequest, OpenAsiSidebarPanelResponse } from "@/shared/proto/index.host"

export async function openClineSidebarPanel(_: OpenAsiSidebarPanelRequest): Promise<OpenAsiSidebarPanelResponse> {
	await vscode.commands.executeCommand(`${ExtensionRegistryInfo.views.Sidebar}.focus`)
	return {}
}
