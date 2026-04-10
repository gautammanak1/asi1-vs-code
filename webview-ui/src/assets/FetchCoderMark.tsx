import type { CSSProperties, ImgHTMLAttributes } from "react"
import type { Environment } from "../../../src/shared/config-types"
import iconUrl from "./icons/icon.png"

export type FetchCoderMarkVariant = "white" | "black" | "variable" | "tired" | "santa"

const VARIANT_STYLE: Record<FetchCoderMarkVariant, CSSProperties> = {
	black: { objectFit: "contain" },
	white: { objectFit: "contain", filter: "brightness(0) invert(1)" },
	variable: {
		objectFit: "contain",
		filter: "brightness(0) invert(1) drop-shadow(0 0 10px rgba(124, 224, 116, 0.55))",
	},
	tired: {
		objectFit: "contain",
		opacity: 0.72,
		filter: "brightness(0) invert(1) drop-shadow(0 0 6px rgba(124, 224, 116, 0.35))",
	},
	santa: {
		objectFit: "contain",
		filter: "brightness(0) invert(1) drop-shadow(0 0 8px rgba(248, 113, 113, 0.45))",
	},
}

/**
 * Fetch Coder wordmark from `icons/icon.png`. Use `variant` for light-on-dark vs original, glow accents, etc.
 */
export function FetchCoderMark(
	props: ImgHTMLAttributes<HTMLImageElement> & {
		variant?: FetchCoderMarkVariant
		/** Kept for call-site compatibility; unused */
		environment?: Environment
	},
) {
	const {
		variant = "white",
		environment: _environment,
		style,
		alt = "Fetch Coder",
		...rest
	} = props
	return (
		<img
			alt={alt}
			draggable={false}
			src={iconUrl}
			{...rest}
			style={{ ...VARIANT_STYLE[variant], ...style }}
		/>
	)
}

export default FetchCoderMark

/** Resolved URL for the bundled PNG (e.g. rare custom layouts) */
export const FETCH_CODER_ICON_URL = iconUrl
