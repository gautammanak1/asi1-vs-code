import { VSCodeLink } from "@vscode/webview-ui-toolkit/react"
import { ASI_DEVELOPER_PORTAL_URL } from "@/config/urls"
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
						Fetch Coder v{version}
					</h2>
					<p className="mb-0 mt-3 text-sm leading-relaxed text-(--vscode-foreground)/90">
						Autonomous coding agent for VS Code and compatible editors, powered by{" "}
						<strong>ASI:One</strong> (OpenAI-compatible API). It plans and edits in your repo, runs commands you
						approve, uses MCP tools you enable, and keeps context in sync with your workspace.
					</p>
					<ul className="mb-0 mt-3 pl-5 text-sm leading-relaxed text-(--vscode-foreground)/85 list-disc space-y-1.5">
						<li>
							API keys:{" "}
							<VSCodeLink className="text-inherit" href={ASI_DEVELOPER_PORTAL_URL} style={{ fontSize: "inherit", textDecoration: "underline" }}>
								ASI:One developer portal
							</VSCodeLink>
						</li>
						<li>
							Docs:{" "}
							<VSCodeLink
								className="text-inherit"
								href="https://docs.asi1.ai/documentation/getting-started/quickstart"
								style={{ fontSize: "inherit", textDecoration: "underline" }}
							>
								Quickstart
							</VSCodeLink>
						</li>
						<li>
							Product:{" "}
							<VSCodeLink className="text-inherit" href="https://fetch-coder.vercel.app/" style={{ fontSize: "inherit", textDecoration: "underline" }}>
								fetch-coder.vercel.app
							</VSCodeLink>
						</li>
						<li>
							Issues:{" "}
							<VSCodeLink
								className="text-inherit"
								href="https://github.com/gautammanak1/asi1-vs-code/issues"
								style={{ fontSize: "inherit", textDecoration: "underline" }}
							>
								GitHub
							</VSCodeLink>
						</li>
					</ul>
				</div>
			</Section>
		</div>
	)
}

export default AboutSection
