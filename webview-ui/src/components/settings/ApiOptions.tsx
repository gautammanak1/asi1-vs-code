import type React from "react"
import type { ReactNode } from "react"
import { Mode } from "@shared/storage/types"
import { DROPDOWN_Z_INDEX, OPENROUTER_MODEL_PICKER_Z_INDEX } from "./z-index-constants"
import { AsiOneSettings } from "./providers/AsiOneSettings"

export { DROPDOWN_Z_INDEX, OPENROUTER_MODEL_PICKER_Z_INDEX }

interface ApiOptionsProps {
	showModelOptions: boolean
	apiErrorMessage?: string
	modelIdErrorMessage?: string
	isPopup?: boolean
	currentMode: Mode
	initialModelTab?: "recommended" | "free"
}

export const DropdownContainer = ({
	children,
	className,
	zIndex,
	style,
}: {
	children: ReactNode
	className?: string
	zIndex?: number
	style?: React.CSSProperties
}) => (
	<div className={className} style={{ position: "relative", zIndex: zIndex ?? DROPDOWN_Z_INDEX, ...style }}>
		{children}
	</div>
)

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
		<div style={{ display: "flex", flexDirection: "column", gap: 5, marginBottom: isPopup ? -10 : 0 }}>
			<div className="mb-1">
				<span style={{ fontWeight: 500 }}>ASI:One</span>
				<p className="text-description text-sm mt-0.5 mb-2">
					Add your API key (or set <code className="text-xs">ASI_ONE_API_KEY</code> in the environment). Endpoint and model are
					fixed.
				</p>
			</div>

			<AsiOneSettings currentMode={currentMode} />

			{apiErrorMessage && (
				<p
					style={{
						margin: "-10px 0 4px 0",
						fontSize: 12,
						color: "var(--vscode-errorForeground)",
					}}>
					{apiErrorMessage}
				</p>
			)}
			{modelIdErrorMessage && (
				<p
					style={{
						margin: "-10px 0 4px 0",
						fontSize: 12,
						color: "var(--vscode-errorForeground)",
					}}>
					{modelIdErrorMessage}
				</p>
			)}
		</div>
	)
}

export default ApiOptions
