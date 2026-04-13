import { SseError } from "@modelcontextprotocol/sdk/client/sse.js"

/**
 * True when the failure is typically a **transient** HTTP/stream closure (peer idle timeout,
 * load balancer, deploy, HTTP/2 GOAWAY), not a misconfiguration or auth failure.
 *
 * The MCP SDK wraps EventSource errors as {@link SseError} with message `SSE error: ${detail}`.
 * Node/undici often reports remote closes as `TypeError: terminated: other side closed`.
 */
export function isRecoverableRemoteStreamClosureError(error: unknown): boolean {
	if (error == null) {
		return false
	}

	const raw = error instanceof Error ? error.message : String(error)
	const msg = raw.toLowerCase()

	// Primary case: SDK-wrapped SSE stream drop
	if (error instanceof SseError) {
		if (msg.includes("terminated") && msg.includes("other side closed")) {
			return true
		}
		if (msg.includes("other side closed")) {
			return true
		}
		if (msg.includes("network") && (msg.includes("error") || msg.includes("failed"))) {
			return true
		}
	}

	// Same underlying failures when not wrapped (e.g. Streamable HTTP fetch body)
	if (msg.includes("terminated") && msg.includes("other side closed")) {
		return true
	}
	if (msg.includes("econnreset") || msg.includes("socket hang up") || msg.includes("etimedout")) {
		return true
	}

	return false
}
