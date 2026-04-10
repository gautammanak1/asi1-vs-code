import { SVGProps } from "react"
import type { Environment } from "../../../src/shared/config-types"

const AsiLogoTired = (props: SVGProps<SVGSVGElement> & { environment?: Environment }) => {
	const { environment: _environment, ...svgProps } = props

	return (
		<svg viewBox="0 0 60 60" width="60" height="60" xmlns="http://www.w3.org/2000/svg" {...svgProps}>
			<defs>
				<linearGradient id="asi-grad-tired" x1="0%" y1="0%" x2="100%" y2="100%">
					<stop offset="0%" stopColor="#22d3ee" opacity="0.6" />
					<stop offset="100%" stopColor="#818cf8" opacity="0.6" />
				</linearGradient>
			</defs>
			<polygon points="30,6 2,20 30,34 58,20" fill="none" stroke="url(#asi-grad-tired)" strokeWidth="2.5" strokeLinejoin="round" />
			<line x1="30" y1="34" x2="30" y2="50" stroke="url(#asi-grad-tired)" strokeWidth="2" />
			<path d="M14 26 L14 40 Q22 48 30 48 Q38 48 46 40 L46 26" fill="none" stroke="url(#asi-grad-tired)" strokeWidth="2" strokeLinecap="round" />
			<circle cx="30" cy="50" r="3" fill="#22d3ee" opacity="0.5" />
		</svg>
	)
}
export default AsiLogoTired
