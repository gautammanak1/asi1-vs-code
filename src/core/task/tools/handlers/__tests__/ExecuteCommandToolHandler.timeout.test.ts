import assert from "node:assert/strict"
import { describe, it } from "mocha"
import {
	inferRequiresApprovalWhenMissing,
	isLikelyLongRunningCommand,
	resolveCommandTimeoutSeconds,
} from "../ExecuteCommandToolHandler"

describe("ExecuteCommandToolHandler timeout policy", () => {
	it("returns undefined when managed timeout is disabled", () => {
		const timeout = resolveCommandTimeoutSeconds("npm test", undefined, false)
		assert.equal(timeout, undefined)
	})

	it("uses explicit timeout when provided", () => {
		const timeout = resolveCommandTimeoutSeconds("npm test", "45", true)
		assert.equal(timeout, 45)
	})

	it("falls back to default timeout for short commands", () => {
		const timeout = resolveCommandTimeoutSeconds("ls -la", undefined, true)
		assert.equal(timeout, 30)
	})

	it("uses extended timeout for known long-running commands", () => {
		const timeout = resolveCommandTimeoutSeconds("npm run build", undefined, true)
		assert.equal(timeout, 300)
	})

	it("detects common long-running command families", () => {
		assert.equal(isLikelyLongRunningCommand("cargo build --release"), true)
		assert.equal(isLikelyLongRunningCommand("docker build ."), true)
		assert.equal(isLikelyLongRunningCommand("pytest -q"), true)
	})
})

describe("inferRequiresApprovalWhenMissing", () => {
	it("defaults read-only style commands to false", () => {
		assert.equal(inferRequiresApprovalWhenMissing("git status"), "false")
		assert.equal(inferRequiresApprovalWhenMissing("ls -la"), "false")
		assert.equal(inferRequiresApprovalWhenMissing("npm run dev"), "false")
	})

	it("defaults potentially impactful commands to true", () => {
		assert.equal(inferRequiresApprovalWhenMissing("rm -rf node_modules"), "true")
		assert.equal(inferRequiresApprovalWhenMissing("npm install"), "true")
	})
})
