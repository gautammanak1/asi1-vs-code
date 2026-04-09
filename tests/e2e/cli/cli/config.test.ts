// ---------------------------------------------------------------------------
// Asi config — CLI tests
//
// Covers:
//   - `Asi config --config <dir>` — shows config for specific directory
//   - `Asi config --help`         — help page
// ---------------------------------------------------------------------------

import { test } from "@microsoft/tui-test"
import { Asi_BIN, TERMINAL_WIDE } from "../helpers/constants.js"
import { AsiEnv } from "../helpers/env.js"
import { expectVisible } from "../helpers/terminal.js"

// ---------------------------------------------------------------------------
// Asi config --help
// ---------------------------------------------------------------------------
test.describe("Asi config --help", () => {
	test.use({
		program: { file: Asi_BIN, args: ["config", "--help"] },
		...TERMINAL_WIDE,
		env: AsiEnv("default"),
	})

	test("shows config help page", async ({ terminal }) => {
		await expectVisible(terminal, "Usage:")
		await expectVisible(terminal, "--config")
	})
})

// ---------------------------------------------------------------------------
// Asi config --config <dir>
// Shows interactive config view for the specified directory
// ---------------------------------------------------------------------------
test.describe("Asi config (default config)", () => {
	test.use({
		program: { file: Asi_BIN, args: ["config"] },
		...TERMINAL_WIDE,
		env: AsiEnv("default"),
	})
})

test.describe("Asi config --config (claude-sonnet-4.6)", () => {
	test.use({
		program: {
			file: Asi_BIN,
			args: ["config", "--config", "configs/claude-sonnet-4.6"],
		},
		...TERMINAL_WIDE,
		env: AsiEnv("claude-sonnet-4.6"),
	})
})
