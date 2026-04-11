import type { CSSProperties, ImgHTMLAttributes } from "react"
import { useState } from "react"
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

/** Inline mark so the logo always renders in the VS Code webview even if bundled PNG URLs fail CSP/path resolution */
function FetchCoderMarkSvg({
	className,
	style,
}: {
	className?: string
	style?: CSSProperties
}) {
	return (
		<svg
			className={className}
			viewBox="0 0 48 48"
			width={56}
			height={56}
			aria-hidden
			style={{ flexShrink: 0, ...style }}
		>
			<defs>
				<linearGradient id="fc-mark-grad" x1="0%" y1="0%" x2="100%" y2="100%">
					<stop offset="0%" stopColor="#0052FF" />
					<stop offset="100%" stopColor="#7CE074" />
				</linearGradient>
			</defs>
			<rect x="2" y="2" width="44" height="44" rx="12" fill="url(#fc-mark-grad)" />
			<text
				x="24"
				y="31"
				textAnchor="middle"
				fontFamily="system-ui, sans-serif"
				fontSize="17"
				fontWeight="800"
				fill="#0a0a0a"
			>
				FC
			</text>
		</svg>
	)
}

/**
 * Fetch Coder mark: prefers bundled PNG when it loads; falls back to an inline SVG so the welcome/header never shows an empty box in the webview.
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
		className,
		style,
		alt = "Fetch Coder",
		...rest
	} = props
	const [imgFailed, setImgFailed] = useState(false)

	if (imgFailed) {
		return <FetchCoderMarkSvg className={className} style={style} />
	}

	return (
		<img
			alt={alt}
			draggable={false}
			src={iconUrl}
			{...rest}
			className={className}
			style={{ ...VARIANT_STYLE[variant], ...style }}
			onError={() => setImgFailed(true)}
		/>
	)
}

export default FetchCoderMark

/** Resolved URL for the bundled PNG (e.g. rare custom layouts) */
export const FETCH_CODER_ICON_URL = iconUrl
