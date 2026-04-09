// ---------------------------------------------------------------------------
// Asi dev — CLI tests
//
// Covers:
//   - `Asi dev log`
// ---------------------------------------------------------------------------

import { test } from "@microsoft/tui-test"
import { Asi_BIN, TERMINAL_WIDE } from "../helpers/constants.js"
import { AsiEnv } from "../helpers/env.js"

test.describe("Asi dev log", () => {
	test.use({
		program: { file: Asi_BIN, args: ["dev", "log"] },
		...TERMINAL_WIDE,
		env: AsiEnv("default"),
	})
})
