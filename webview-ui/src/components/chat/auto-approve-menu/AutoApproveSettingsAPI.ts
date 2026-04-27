import { AutoApprovalSettings } from "@shared/AutoApprovalSettings"
import { StateServiceClient } from "@/services/grpc-client"
import { asiDebug } from "@/utils/debug";

/**
 * Updates auto approval settings using the gRPC/Protobus client
 * @param settings The auto approval settings to update
 * @throws Error if the update fails
 */
export async function updateAutoApproveSettings(settings: AutoApprovalSettings) {
	try {
		await StateServiceClient.updateAutoApprovalSettings({ metadata: {}, ...settings })
	} catch (error) {
		asiDebug.error("Failed to update auto approval settings:", error)
		throw error
	}
}
