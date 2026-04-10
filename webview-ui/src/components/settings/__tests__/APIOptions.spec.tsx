import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ExtensionStateContextProvider } from "@/context/ExtensionStateContext";
import ApiOptions from "../ApiOptions";

vi.mock("@/components/settings/utils/useApiConfigurationHandlers", () => ({
	useApiConfigurationHandlers: () => ({
		handleFieldChange: vi.fn(),
		handleFieldsChange: vi.fn().mockResolvedValue(undefined),
		handleModeFieldChange: vi.fn(),
		handleModeFieldsChange: vi.fn(),
	}),
}));

describe("ApiOptions (ASI:One only)", () => {
	const mockPostMessage = vi.fn();

	beforeEach(() => {
		//@ts-expect-error - vscode is not defined in the global namespace in test environment
		global.vscode = { postMessage: mockPostMessage };
	});

	it("renders ASI:One API section and fixed model", () => {
		render(
			<ExtensionStateContextProvider>
				<ApiOptions currentMode="plan" showModelOptions={true} />
			</ExtensionStateContextProvider>,
		);
		expect(screen.getAllByText(/ASI:One/).length).toBeGreaterThan(0);
		expect(screen.getByText("Model")).toBeInTheDocument();
		expect(screen.getByText("asi1", { exact: true })).toBeInTheDocument();
	});
});
