import { test } from "@microsoft/tui-test"
import { Asi_BIN } from "./helpers/constants.js"
import { expectVisible, testEnv } from "./utils.js"

// ---------------------------------------------------------------------------
// Asi --version  (root flag)
// ---------------------------------------------------------------------------
test.describe("Asi --version", () => {
	test.use({
		program: { file: Asi_BIN, args: ["--version"] },
		env: testEnv("claude-sonnet-4.6"),
	})

	test("prints the version string", async ({ terminal }) => {
		await expectVisible(terminal, /\d+\.\d+\.\d+/g)
	})
})

// ---------------------------------------------------------------------------
// Asi -V  (short flag)
// ---------------------------------------------------------------------------
test.describe("Asi -V", () => {
	test.use({
		program: { file: Asi_BIN, args: ["-V"] },
		env: testEnv("claude-sonnet-4.6"),
	})

	test("prints the version string with short flag", async ({ terminal }) => {
		await expectVisible(terminal, /\d+\.\d+\.\d+/g)
	})
})

// ---------------------------------------------------------------------------
// Asi version  (subcommand)
// ---------------------------------------------------------------------------
test.describe("Asi version subcommand", () => {
	test.use({
		program: { file: Asi_BIN, args: ["version"] },
		env: testEnv("claude-sonnet-4.6"),
	})

	test("prints 'Asi CLI version:' message", async ({ terminal }) => {
		await expectVisible(terminal, ["Asi CLI version:", /\d+\.\d+\.\d+/g])
	})
})
