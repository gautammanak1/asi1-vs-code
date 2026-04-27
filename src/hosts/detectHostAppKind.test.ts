import { strict as assert } from "assert";
import { describe, it } from "mocha";
import {
	type HostAppKind,
	inferHostAppFromAppName,
	resolveHostAppKind,
} from "./detectHostAppKind";

function assertKind(got: HostAppKind, expected: HostAppKind): void {
	assert.strictEqual(got, expected);
}

describe("detectHostAppKind", () => {
	describe("inferHostAppFromAppName", () => {
		it("returns cursor when appName contains cursor", () => {
			assertKind(inferHostAppFromAppName("Cursor"), "cursor");
			assertKind(inferHostAppFromAppName("Cursor Nightly"), "cursor");
		});

		it("returns vscode for typical VS Code and forks", () => {
			assertKind(inferHostAppFromAppName("Visual Studio Code"), "vscode");
			assertKind(inferHostAppFromAppName("VSCodium"), "vscode");
		});

		it("returns unknown for empty or missing", () => {
			assertKind(inferHostAppFromAppName(undefined), "unknown");
			assertKind(inferHostAppFromAppName(""), "unknown");
			assertKind(inferHostAppFromAppName("   "), "unknown");
		});
	});

	describe("resolveHostAppKind", () => {
		it("overrides to vscode regardless of appName", () => {
			assertKind(resolveHostAppKind("vscode", "Cursor"), "vscode");
		});

		it("overrides to cursor regardless of appName", () => {
			assertKind(resolveHostAppKind("cursor", "Visual Studio Code"), "cursor");
		});

		it("auto uses appName", () => {
			assertKind(resolveHostAppKind("auto", "Cursor"), "cursor");
			assertKind(resolveHostAppKind(undefined, "Visual Studio Code"), "vscode");
		});
	});
});
