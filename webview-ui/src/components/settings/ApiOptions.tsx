import type React from "react";
import type { ReactNode } from "react";
import { VSCodeLink } from "@vscode/webview-ui-toolkit/react";
import { Mode } from "@shared/storage/types";
import { cn } from "@/lib/utils";
import {
	DROPDOWN_Z_INDEX,
	OPENROUTER_MODEL_PICKER_Z_INDEX,
} from "./z-index-constants";
import { ASI_DEVELOPER_PORTAL_URL } from "@/config/urls";
import { AsiOneSettings } from "./providers/AsiOneSettings";
import { settingsUi } from "./settingsUi";

export { DROPDOWN_Z_INDEX, OPENROUTER_MODEL_PICKER_Z_INDEX };

interface ApiOptionsProps {
	showModelOptions: boolean;
	apiErrorMessage?: string;
	modelIdErrorMessage?: string;
	isPopup?: boolean;
	currentMode: Mode;
	initialModelTab?: "recommended" | "free";
}

export const DropdownContainer = ({
	children,
	className,
	zIndex,
	style,
}: {
	children: ReactNode;
	className?: string;
	zIndex?: number;
	style?: React.CSSProperties;
}) => (
	<div
		className={className}
		style={{
			position: "relative",
			zIndex: zIndex ?? DROPDOWN_Z_INDEX,
			...style,
		}}
	>
		{children}
	</div>
);

/** ASI:One only — no provider picker; key + fixed endpoint/model. */
const ApiOptions = ({
	showModelOptions: _showModelOptions,
	apiErrorMessage,
	modelIdErrorMessage,
	isPopup,
	currentMode,
	initialModelTab: _initialModelTab,
}: ApiOptionsProps) => {
	return (
		<div className={cn(settingsUi.stack, isPopup && "-mb-2.5")}>
			<div className="mb-1">
				<span className="text-[13px] font-semibold text-(--vscode-foreground)">
					ASI:One
				</span>
				<p className={cn(settingsUi.hint, "mt-1.5")}>
					Add your API key (or set{" "}
					<code className="rounded bg-(--vscode-textCodeBlock-background) px-1 text-[11px]">
						ASI_ONE_API_KEY
					</code>{" "}
					in the environment). Create or manage keys in the{" "}
					<VSCodeLink
						className="text-inherit"
						href={ASI_DEVELOPER_PORTAL_URL}
						style={{ fontSize: "inherit", textDecoration: "underline" }}
					>
						ASI:One developer portal
					</VSCodeLink>
					. New to the API? See the{" "}
					<VSCodeLink
						className="text-inherit"
						href="https://docs.asi1.ai/documentation/getting-started/quickstart"
						style={{ fontSize: "inherit", textDecoration: "underline" }}
					>
						quickstart
					</VSCodeLink>{" "}
					and the{" "}
					<VSCodeLink
						className="text-inherit"
						href="https://fetch-coder.vercel.app/"
						style={{ fontSize: "inherit", textDecoration: "underline" }}
					>
						Fetch Coder
					</VSCodeLink>{" "}
					site.
				</p>
			</div>

			<AsiOneSettings currentMode={currentMode} />

			{apiErrorMessage && (
				<p className="m-0 text-xs text-(--vscode-errorForeground)">
					{apiErrorMessage}
				</p>
			)}
			{modelIdErrorMessage && (
				<p className="m-0 text-xs text-(--vscode-errorForeground)">
					{modelIdErrorMessage}
				</p>
			)}
		</div>
	);
};

export default ApiOptions;
