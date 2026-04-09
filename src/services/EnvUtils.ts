import { isMultiRootWorkspace } from "@/core/workspace/utils/workspace-detection"
import { HostProvider } from "@/hosts/host-provider"
import { ExtensionRegistryInfo } from "@/registry"
import { EmptyRequest } from "@/shared/proto/asi/common"
import { Logger } from "@/shared/services/Logger"

// Canonical header names for extra client/host context
export const AsiHeaders = {
	PLATFORM: "X-PLATFORM",
	PLATFORM_VERSION: "X-PLATFORM-VERSION",
	CLIENT_VERSION: "X-CLIENT-VERSION",
	CLIENT_TYPE: "X-CLIENT-TYPE",
	CORE_VERSION: "X-CORE-VERSION",
	IS_MULTIROOT: "X-IS-MULTIROOT",
} as const
export type AsiHeaderName = (typeof AsiHeaders)[keyof typeof AsiHeaders]

export function buildExternalBasicHeaders(): Record<string, string> {
	return {
		"User-Agent": `Asi/${ExtensionRegistryInfo.version}`,
	}
}

export async function buildBasicAsiHeaders(): Promise<Record<string, string>> {
	const headers: Record<string, string> = buildExternalBasicHeaders()
	try {
		const host = await HostProvider.env.getHostVersion(EmptyRequest.create({}))
		headers[AsiHeaders.PLATFORM] = host.platform || "unknown"
		headers[AsiHeaders.PLATFORM_VERSION] = host.version || "unknown"
		headers[AsiHeaders.CLIENT_TYPE] = host.AsiType || "unknown"
		headers[AsiHeaders.CLIENT_VERSION] = host.AsiVersion || "unknown"
	} catch (error) {
		Logger.log("Failed to get IDE/platform info via HostBridge EnvService.getHostVersion", error)
		headers[AsiHeaders.PLATFORM] = "unknown"
		headers[AsiHeaders.PLATFORM_VERSION] = "unknown"
		headers[AsiHeaders.CLIENT_TYPE] = "unknown"
		headers[AsiHeaders.CLIENT_VERSION] = "unknown"
	}
	headers[AsiHeaders.CORE_VERSION] = ExtensionRegistryInfo.version

	return headers
}

export async function buildAsiExtraHeaders(): Promise<Record<string, string>> {
	const headers = await buildBasicAsiHeaders()

	try {
		const isMultiRoot = await isMultiRootWorkspace()
		headers[AsiHeaders.IS_MULTIROOT] = isMultiRoot ? "true" : "false"
	} catch (error) {
		Logger.log("Failed to detect multi-root workspace", error)
		headers[AsiHeaders.IS_MULTIROOT] = "false"
	}

	return headers
}
