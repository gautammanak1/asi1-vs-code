import Section from "../Section"
import { settingsUi } from "../settingsUi"

interface AboutSectionProps {
	version: string
	renderSectionHeader: (tabId: string) => JSX.Element | null
}

const AboutSection = ({ version, renderSectionHeader }: AboutSectionProps) => {
	return (
		<div>
			{renderSectionHeader("about")}
			<Section>
				<div className={settingsUi.card}>
					<h2 className="m-0 text-lg font-semibold tracking-tight" style={{ color: "#85F47C" }}>
						fetch code v{version}
					</h2>
					<p className="mb-0 mt-3 text-sm leading-relaxed text-(--vscode-foreground)/90">
						An AI coding assistant for VS Code powered by ASI:One. fetch code can handle complex software
						development tasks step-by-step with tools that let it create and edit files, explore large projects,
						and execute terminal commands (after you grant permission).
					</p>
				</div>
			</Section>
		</div>
	)
}

export default AboutSection
