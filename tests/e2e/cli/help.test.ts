import { test } from "@microsoft/tui-test"
import { Asi_BIN } from "./helpers/constants.js"
import { expectVisible, testEnv } from "./utils.js"

const HELP_TERMINAL = { columns: 120, rows: 50 }

// ===========================================================================
// Asi --help  (root help)
// ===========================================================================
test.describe("Asi --help", () => {
	test.use({
		program: { file: Asi_BIN, args: ["--help"] },
		env: testEnv("claude-sonnet-4.6"),
		...HELP_TERMINAL,
	})

	test("shows Usage line and lists all subcommands", async ({ terminal }) => {
		await expectVisible(terminal, [
			"Usage:",
			"task|t",
			"history|h",
			"config [options]",
			"auth [options]",
			"version",
			"update [options]",
			"dev ",
		])
	})

	test("shows all root-level option flags", async ({ terminal }) => {
		await expectVisible(terminal, [
			"--act",
			"--plan",
			"--yolo",
			"--timeout",
			"--model",
			"--verbose",
			"--cwd",
			"--config",
			"--thinking",
			"--reasoning-effort",
			"--max-consecutive-mistakes",
			"--json",
			"--double-check-completion",
			"--acp",
			"--tui",
			"--taskId",
		])
	})
})

// ===========================================================================
// Asi -h  (short help flag)
// ===========================================================================
test.describe("Asi -h", () => {
	test.use({
		program: { file: Asi_BIN, args: ["-h"] },
		env: testEnv("claude-sonnet-4.6"),
		...HELP_TERMINAL,
	})

	test("shows Usage line with short flag", async ({ terminal }) => {
		await expectVisible(terminal, "Usage:")
	})
})

// ===========================================================================
// Asi task --help
// ===========================================================================
test.describe("Asi task --help", () => {
	test.use({
		program: { file: Asi_BIN, args: ["task", "--help"] },
		env: testEnv("claude-sonnet-4.6"),
		...HELP_TERMINAL,
	})

	test("shows task usage, prompt argument, and all flags", async ({ terminal }) => {
		await expectVisible(terminal, [
			"Usage:",
			"prompt",
			"--act",
			"--plan",
			"--yolo",
			"--timeout",
			"--model",
			"--verbose",
			"--cwd",
			"--config",
			"--thinking",
			"--reasoning-effort",
			"--max-consecutive-mistakes",
			"--json",
			"--double-check-completion",
			"--taskId",
		])
	})
})

// ===========================================================================
// Asi t --help  (task alias)
// ===========================================================================
test.describe("Asi t --help (task alias)", () => {
	test.use({
		program: { file: Asi_BIN, args: ["t", "--help"] },
		env: testEnv("claude-sonnet-4.6"),
		...HELP_TERMINAL,
	})

	test("shows task usage and flags via alias", async ({ terminal }) => {
		await expectVisible(terminal, ["Usage:", "--yolo"])
	})
})

// ===========================================================================
// Asi history --help
// ===========================================================================
test.describe("Asi history --help", () => {
	test.use({
		program: { file: Asi_BIN, args: ["history", "--help"] },
		env: testEnv("claude-sonnet-4.6"),
		...HELP_TERMINAL,
	})

	test("shows history usage and all flags", async ({ terminal }) => {
		await expectVisible(terminal, ["Usage:", "--limit", "--page", "--config"])
	})
})

// ===========================================================================
// Asi h --help  (history alias)
// ===========================================================================
test.describe("Asi h --help (history alias)", () => {
	test.use({
		program: { file: Asi_BIN, args: ["h", "--help"] },
		env: testEnv("claude-sonnet-4.6"),
		...HELP_TERMINAL,
	})

	test("shows history usage and flags via alias", async ({ terminal }) => {
		await expectVisible(terminal, ["Usage:", "--limit"])
	})
})

// ===========================================================================
// Asi config --help
// ===========================================================================
test.describe("Asi config --help", () => {
	test.use({
		program: { file: Asi_BIN, args: ["config", "--help"] },
		env: testEnv("claude-sonnet-4.6"),
		...HELP_TERMINAL,
	})

	test("shows config usage and --config flag", async ({ terminal }) => {
		await expectVisible(terminal, ["Usage:", "--config"])
	})
})

// ===========================================================================
// Asi auth --help
// ===========================================================================
test.describe("Asi auth --help", () => {
	test.use({
		program: { file: Asi_BIN, args: ["auth", "--help"] },
		env: testEnv("claude-sonnet-4.6"),
		...HELP_TERMINAL,
	})

	test("shows auth usage and all flags", async ({ terminal }) => {
		await expectVisible(terminal, [
			"Usage:",
			"--provider",
			"--apikey",
			"--modelid",
			"--baseurl",
			"--verbose",
			"--cwd",
			"--config",
		])
	})
})

// ===========================================================================
// Asi version --help
// ===========================================================================
test.describe("Asi version --help", () => {
	test.use({
		program: { file: Asi_BIN, args: ["version", "--help"] },
		env: testEnv("claude-sonnet-4.6"),
		...HELP_TERMINAL,
	})

	test("shows version command usage", async ({ terminal }) => {
		await expectVisible(terminal, "Usage:")
	})
})

// ===========================================================================
// Asi update --help
// ===========================================================================
test.describe("Asi update --help", () => {
	test.use({
		program: { file: Asi_BIN, args: ["update", "--help"] },
		env: testEnv("claude-sonnet-4.6"),
		...HELP_TERMINAL,
	})

	test("shows update usage and --verbose flag", async ({ terminal }) => {
		await expectVisible(terminal, ["Usage:", "--verbose"])
	})
})

// ===========================================================================
// Asi dev --help
// ===========================================================================
test.describe("Asi dev --help", () => {
	test.use({
		program: { file: Asi_BIN, args: ["dev", "--help"] },
		env: testEnv("claude-sonnet-4.6"),
		...HELP_TERMINAL,
	})

	test("shows dev usage and lists log subcommand", async ({ terminal }) => {
		await expectVisible(terminal, ["Usage:", "log"])
	})
})
