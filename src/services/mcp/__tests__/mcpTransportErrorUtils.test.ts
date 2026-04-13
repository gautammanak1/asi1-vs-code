import { SseError } from "@modelcontextprotocol/sdk/client/sse.js"
import { expect } from "chai"
import { isRecoverableRemoteStreamClosureError } from "../mcpTransportErrorUtils"

describe("isRecoverableRemoteStreamClosureError", () => {
	it("returns true for SDK SseError with terminated / other side closed", () => {
		const err = new SseError(undefined, "TypeError: terminated: other side closed", {} as any)
		expect(isRecoverableRemoteStreamClosureError(err)).to.equal(true)
	})

	it("returns true for raw message pattern", () => {
		expect(isRecoverableRemoteStreamClosureError(new Error("TypeError: terminated: other side closed"))).to.equal(true)
	})

	it("returns false for unrelated errors", () => {
		expect(isRecoverableRemoteStreamClosureError(new Error("Unauthorized"))).to.equal(false)
		expect(isRecoverableRemoteStreamClosureError(null)).to.equal(false)
	})
})
