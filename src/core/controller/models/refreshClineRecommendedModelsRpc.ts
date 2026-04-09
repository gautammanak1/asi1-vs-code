import { EmptyRequest } from "@shared/proto/asi/common"
import { AsiRecommendedModel, AsiRecommendedModelsResponse } from "@shared/proto/asi/models"
import type { Controller } from "../index"
import { refreshClineRecommendedModels } from "./refreshClineRecommendedModels"

export async function refreshClineRecommendedModelsRpc(
	_controller: Controller,
	_request: EmptyRequest,
): Promise<AsiRecommendedModelsResponse> {
	const models = await refreshClineRecommendedModels()
	return AsiRecommendedModelsResponse.create({
		recommended: models.recommended.map((model) =>
			AsiRecommendedModel.create({
				id: model.id,
				name: model.name,
				description: model.description,
				tags: model.tags,
			}),
		),
		free: models.free.map((model) =>
			AsiRecommendedModel.create({
				id: model.id,
				name: model.name,
				description: model.description,
				tags: model.tags,
			}),
		),
	})
}
