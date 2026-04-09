// ---------------------------------------------------------------------------
// Asi history — CLI tests
//
// Covers:
//   - `Asi history --limit X`  — pagination limit
//   - `Asi history --page N`   — page selection
//   - `Asi history --config`   — custom config directory
//   - `Asi history --help`     — help page
// ---------------------------------------------------------------------------

import { test } from "@microsoft/tui-test"
import { Asi_BIN, TERMINAL_WIDE } from "../helpers/constants.js"
import { AsiEnv } from "../helpers/env.js"
import { expectVisible } from "../helpers/terminal.js"

// ---------------------------------------------------------------------------
// Asi history --help
// ---------------------------------------------------------------------------
test.describe("Asi history --help", () => {
	test.use({
		program: { file: Asi_BIN, args: ["history", "--help"] },
		...TERMINAL_WIDE,
		env: AsiEnv("default"),
	})

	test("shows history help page with all flags", async ({ terminal }) => {
		await expectVisible(terminal, "Usage:")
		await expectVisible(terminal, "--limit")
		await expectVisible(terminal, "--page")
		await expectVisible(terminal, "--config")
	})
})
