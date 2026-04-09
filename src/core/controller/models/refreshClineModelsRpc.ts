import { EmptyRequest } from "@shared/proto/asi/common"
import { OpenRouterCompatibleModelInfo } from "@shared/proto/asi/models"
import { toProtobufModels } from "../../../shared/proto-conversions/models/typeConversion"
import type { Controller } from "../index"
import { refreshClineModels } from "./refreshClineModels"

/**
 * Refreshes Asi models and returns protobuf types for gRPC
 * @param controller The controller instance
 * @param request Empty request (unused but required for gRPC signature)
 * @returns OpenRouterCompatibleModelInfo with protobuf types (reusing the same proto type)
 */
export async function refreshClineModelsRpc(
	controller: Controller,
	_request: EmptyRequest,
): Promise<OpenRouterCompatibleModelInfo> {
	const models = await refreshClineModels(controller)
	return OpenRouterCompatibleModelInfo.create({
		models: toProtobufModels(models),
	})
}
