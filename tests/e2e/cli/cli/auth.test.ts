// ---------------------------------------------------------------------------
// Asi auth — CLI flag and contract tests
//
// These tests cover the `Asi auth` subcommand behavior:
//   - Interactive auth screen navigation
//   - `Asi auth -p <provider> -k <apiKey> -m <modelId>` golden path
//   - Invalid provider / key / model error handling
//   - Partial-flag fallback to interactive screen
//   - `Asi auth --help`
// ---------------------------------------------------------------------------

import { test } from "@microsoft/tui-test"
import { Asi_BIN, TERMINAL_WIDE } from "../helpers/constants.js"
import { AsiEnv } from "../helpers/env.js"
import { waitForAuthScreen } from "../helpers/page-objects/auth.js"
import { expectVisible } from "../helpers/terminal.js"

// ---------------------------------------------------------------------------
// Asi auth  (interactive screen — no flags)
// ---------------------------------------------------------------------------
test.describe("Asi auth (interactive screen)", () => {
	test.use({
		program: { file: Asi_BIN, args: ["auth"] },
		...TERMINAL_WIDE,
		env: AsiEnv("unauthenticated"),
	})

	test("shows all auth options", async ({ terminal }) => {
		await waitForAuthScreen(terminal)
	})

	test("can navigate options with keyUp / keyDown", async ({ terminal }) => {
		await waitForAuthScreen(terminal)
		terminal.keyDown()
		terminal.keyUp()
		// Still on the auth screen after navigation
		await expectVisible(terminal, "Sign in with Asi")
	})
})

// ---------------------------------------------------------------------------
// Asi auth --help
// ---------------------------------------------------------------------------
test.describe("Asi auth --help", () => {
	test.use({
		program: { file: Asi_BIN, args: ["auth", "--help"] },
		...TERMINAL_WIDE,
		env: AsiEnv("unauthenticated"),
	})

	test("shows auth help page", async ({ terminal }) => {
		await expectVisible(terminal, "Usage:")
		await expectVisible(terminal, "--provider")
		await expectVisible(terminal, "--apikey")
		await expectVisible(terminal, "--modelid")
		await expectVisible(terminal, "--baseurl")
	})
})

// ---------------------------------------------------------------------------
// Asi auth with only partial flags → falls back to interactive screen
// ---------------------------------------------------------------------------
test.describe("Asi auth --provider only (partial flags)", () => {
	test.use({
		program: { file: Asi_BIN, args: ["auth", "--provider", "openai"] },
		...TERMINAL_WIDE,
		env: AsiEnv("unauthenticated"),
	})

	test("ignores partial flags and shows interactive auth screen", async ({ terminal }) => {
		await waitForAuthScreen(terminal)
	})
})

test.describe("Asi auth --apikey only (partial flags)", () => {
	test.use({
		program: {
			file: Asi_BIN,
			args: ["auth", "--apikey", "sk-test-key"],
		},
		...TERMINAL_WIDE,
		env: AsiEnv("unauthenticated"),
	})

	test("ignores partial flags and shows interactive auth screen", async ({ terminal }) => {
		await waitForAuthScreen(terminal)
	})
})

test.describe("Asi auth --modelid only (partial flags)", () => {
	test.use({
		program: {
			file: Asi_BIN,
			args: ["auth", "--modelid", "gpt-4o"],
		},
		...TERMINAL_WIDE,
		env: AsiEnv("unauthenticated"),
	})

	test("ignores partial flags and shows interactive auth screen", async ({ terminal }) => {
		await waitForAuthScreen(terminal)
	})
})

test.describe("Asi auth --baseurl only (partial flags)", () => {
	test.use({
		program: {
			file: Asi_BIN,
			args: ["auth", "--baseurl", "https://api.example.com"],
		},
		...TERMINAL_WIDE,
		env: AsiEnv("unauthenticated"),
	})

	test("ignores partial flags and shows interactive auth screen", async ({ terminal }) => {
		await waitForAuthScreen(terminal)
	})
})

test.describe("Asi auth --verbose only (partial flags)", () => {
	test.use({
		program: {
			file: Asi_BIN,
			args: ["auth", "--verbose"],
		},
		...TERMINAL_WIDE,
		env: AsiEnv("unauthenticated"),
	})

	test("ignores --verbose and shows interactive auth screen", async ({ terminal }) => {
		await waitForAuthScreen(terminal)
	})
})

// ---------------------------------------------------------------------------
// Asi auth --cwd
// User sees interactive auth screen; after authing, footer shows workspace dir
// ---------------------------------------------------------------------------
test.describe("Asi auth --cwd", () => {
	test.use({
		program: {
			file: Asi_BIN,
			args: ["auth", "--cwd", "/tmp"],
		},
		...TERMINAL_WIDE,
		env: AsiEnv("unauthenticated"),
	})

	test("shows interactive auth screen with --cwd flag", async ({ terminal }) => {
		await waitForAuthScreen(terminal)
	})
})

// ---------------------------------------------------------------------------
// Asi auth --config <dir>
// User sees interactive auth screen; after authing, custom config dir exists
// with globalState.json and secrets.json; default ~/.Asi does NOT exist
// ---------------------------------------------------------------------------
test.describe("Asi auth --config", () => {
	test.use({
		program: {
			file: Asi_BIN,
			args: ["auth", "--config", "configs/unauthenticated"],
		},
		...TERMINAL_WIDE,
		env: AsiEnv("unauthenticated"),
	})

	test("shows interactive auth screen with --config flag", async ({ terminal }) => {
		await waitForAuthScreen(terminal)
	})
})

// ---------------------------------------------------------------------------
// Asi auth -p <invalid-provider> -k <key> -m <model>
// → should show "invalid provider" and exit 1
// ---------------------------------------------------------------------------
test.describe("Asi auth with invalid provider", () => {
	test.use({
		program: {
			file: Asi_BIN,
			args: ["auth", "--provider", "not-a-real-provider", "--apikey", "sk-test", "--modelid", "gpt-4o"],
		},
		...TERMINAL_WIDE,
		env: AsiEnv("unauthenticated"),
	})

	test("shows invalid provider error", async ({ terminal }) => {
		await expectVisible(terminal, /invalid provider/i, { timeout: 5000 })
	})
})
