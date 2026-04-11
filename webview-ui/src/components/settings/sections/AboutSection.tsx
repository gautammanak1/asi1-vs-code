import Section from "../Section"

interface AboutSectionProps {
	version: string
	renderSectionHeader: (tabId: string) => JSX.Element | null
}
const AboutSection = ({ version, renderSectionHeader }: AboutSectionProps) => {
	return (
		<div>
			{renderSectionHeader("about")}
			<Section>
				<div className="flex px-4 flex-col gap-2">
					<h2 className="text-lg font-semibold" style={{ color: "#85F47C" }}>
						fetch code v{version}
					</h2>
					<p>
						An AI coding assistant for VS Code powered by ASI:One. fetch code can handle complex software
						development tasks step-by-step with tools that let it create & edit files, explore large projects,
						and execute terminal commands (after you grant permission).
					</p>
				</div>
			</Section>
		</div>
	)
}

export default AboutSection
