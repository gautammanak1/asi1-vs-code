// ---------------------------------------------------------------------------
// Environment helpers for test setup.
//
// Usage:
//   test.use({ env: AsiEnv("default") });
//   test.use({ env: AsiEnv("claude-sonnet-4.6") });
//   test.use({ env: AsiEnv("/absolute/path/to/config") });
// ---------------------------------------------------------------------------

import path from "path"

const TEST_SUITE_ROOT = new URL("../", import.meta.url).pathname

/**
 * Build the process environment for a Asi test.
 *
 * @param configDir - Named config under `configs/`, or an absolute path.
 * @param extra     - Additional env vars to merge in (override defaults).
 */
export function AsiEnv(configDir: string, extra: NodeJS.ProcessEnv = {}): NodeJS.ProcessEnv {
	const AsiPath = path.isAbsolute(configDir) ? configDir : path.join(TEST_SUITE_ROOT, "configs", configDir)

	// Remove CI env var so Ink's `is-in-ci` check doesn't disable interactive
	// rendering. When CI=true (set by GitHub Actions / act), Ink treats the
	// environment as non-interactive and skips rendering to stdout — even
	// inside a real PTY — which causes tui-test traces to be empty.
	const { CI: _ci, ...cleanEnv } = process.env

	return {
		...cleanEnv,
		Asi_TELEMETRY_DISABLED: "1",
		Asi_DIR: AsiPath,
		NO_UPDATE_NOTIFIER: "1",
		Asi_NO_AUTO_UPDATE: "1",
		...extra,
	}
}

/**
 * @deprecated Use `AsiEnv` instead. Kept for backward compatibility.
 */
export function testEnv(configDir: string): NodeJS.ProcessEnv {
	return AsiEnv(configDir)
}
