const Module = require("node:module");
const originalRequire = Module.prototype.require;

/**
 * VSCode is not available during unit tests
 * @see ./vscode-mock.ts
 *
 * CommonJS on purpose: Mocha must not load a `.ts` file here (Node ERR_UNKNOWN_FILE_EXTENSION).
 * `ts-node/register` runs before this file and compiles required `.ts` submodules.
 */
/** ESM-only package; ts-node CJS require() would throw ERR_REQUIRE_ESM and Mocha surfaces ERR_UNKNOWN_FILE_EXTENSION. */
function stubExeca() {
	const ok = {
		stdout: Buffer.from(""),
		stderr: Buffer.from(""),
		exitCode: 0,
		failed: false,
	};
	async function execa() {
		return { ...ok };
	}
	execa.sync = () => ok;
	execa.execaSync = execa.sync;
	execa.command = execa;
	execa.execaCommand = execa;
	return Object.assign(execa, { default: execa });
}

Module.prototype.require = function (id) {
	if (id === "vscode") {
		return require("./vscode-mock");
	}
	if (id === "execa" || id.startsWith("execa/")) {
		return stubExeca();
	}
	if (id === "serialize-error") {
		const serializeError = (err) => ({
			name: err?.name,
			message: err?.message,
			stack: err?.stack,
		});
		return { serializeError, default: serializeError };
	}
	if (id === "chrome-launcher") {
		const launch = async () => ({ port: 9222, pid: 0, kill: () => {} });
		return { launch, default: { launch } };
	}
	if (id === "p-wait-for") {
		const fn = async () => {};
		return Object.assign(fn, { default: fn });
	}
	if (id === "@integrations/checkpoints") {
		return {};
	}
	if (id === "@integrations/checkpoints/MultiRootCheckpointManager") {
		return { MultiRootCheckpointManager: class {} };
	}

	return originalRequire.call(this, id);
};

// Minimal String.prototype.toPosix (see src/utils/path.ts) — do not require("../utils/path") here:
// that pulls ESM-only deps (e.g. execa) under ts-node CJS and breaks Mocha bootstrap.
function toPosixPath(p) {
	const isExtendedLengthPath = p.startsWith("\\\\?\\");
	if (isExtendedLengthPath) {
		return p;
	}
	return p.replace(/\\/g, "/");
}
String.prototype.toPosix = function () {
	return toPosixPath(this);
};
