import { Empty, EmptyRequest } from "@shared/proto/Asi/common";
import { Logger } from "@/shared/services/Logger";
import {
	getRequestRegistry,
	type StreamingResponseHandler,
} from "../grpc-handler";
import type { Controller } from "../index";

const active = new Set<StreamingResponseHandler<Empty>>();

export async function subscribeToCheckpointsButtonClicked(
	_controller: Controller,
	_request: EmptyRequest,
	responseStream: StreamingResponseHandler<Empty>,
	requestId?: string,
): Promise<void> {
	active.add(responseStream);
	const cleanup = () => {
		active.delete(responseStream);
	};
	if (requestId) {
		getRequestRegistry().registerRequest(
			requestId,
			cleanup,
			{ type: "checkpoints_button_clicked_subscription" },
			responseStream,
		);
	}
}

export async function sendCheckpointsButtonClickedEvent(): Promise<void> {
	const promises = Array.from(active).map(async (responseStream) => {
		try {
			await responseStream(Empty.create({}), false);
		} catch (error) {
			Logger.error("Error sending checkpoints button clicked event:", error);
			active.delete(responseStream);
		}
	});
	await Promise.all(promises);
}
