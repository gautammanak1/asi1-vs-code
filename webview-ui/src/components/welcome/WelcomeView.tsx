import { BooleanRequest } from "@shared/proto/Asi/common";
import { VSCodeLink } from "@vscode/webview-ui-toolkit/react";
import { memo, useEffect, useState } from "react";
import AsiLogoWhite from "@/assets/FetchCoderLogoWhite";
import ApiOptions from "@/components/settings/ApiOptions";
import { useExtensionState } from "@/context/ExtensionStateContext";
import { StateServiceClient } from "@/services/grpc-client";
import { validateApiConfiguration } from "@/utils/validate";

const WelcomeView = memo(() => {
	const { apiConfiguration, mode } = useExtensionState();
	const [apiErrorMessage, setApiErrorMessage] = useState<string | undefined>(
		undefined,
	);

	const disableLetsGoButton = apiErrorMessage != null;

	const handleSubmit = async () => {
		try {
			await StateServiceClient.setWelcomeViewCompleted(
				BooleanRequest.create({ value: true }),
			);
		} catch (error) {
			console.error(
				"Failed to update API configuration or complete welcome view:",
				error,
			);
		}
	};

	useEffect(() => {
		setApiErrorMessage(validateApiConfiguration(mode, apiConfiguration));
	}, [apiConfiguration, mode]);

	return (
		<div className="fixed inset-0 p-0 flex flex-col" style={{ background: "var(--vscode-sideBar-background)" }}>
			{/* Ambient glow */}
			<div
				className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 rounded-full animate-glow-pulse pointer-events-none"
				style={{ background: "radial-gradient(circle, rgba(6,182,212,0.12) 0%, transparent 70%)", filter: "blur(40px)" }}
			/>

			<div className="h-full px-5 overflow-auto flex flex-col gap-3 relative z-10">
				{/* Logo + Title */}
				<div className="flex flex-col items-center mt-8 mb-3 animate-fade-in-up">
					<div className="animate-float">
						<AsiLogoWhite className="size-16 mb-3 drop-shadow-lg" />
					</div>
					<h2
						className="text-2xl font-bold m-0"
						style={{
							fontFamily: "'Lexend', sans-serif",
							letterSpacing: "-0.03em",
							background: "linear-gradient(135deg, #06b6d4, #a78bfa, #06b6d4)",
							backgroundSize: "200% 200%",
							WebkitBackgroundClip: "text",
							WebkitTextFillColor: "transparent",
							animation: "gradient-shift 4s ease infinite",
						}}
					>
						Fetch Coder
					</h2>
					<p className="text-xs m-0 mt-1.5 tracking-widest uppercase" style={{ color: "var(--vscode-descriptionForeground)", fontFamily: "'Lexend', sans-serif", fontWeight: 300 }}>
						AI Coding Agent · Powered by ASI:One
					</p>
				</div>

				{/* Glass info card */}
				<div
					className="glass rounded-xl px-4 py-3.5 my-1 glow-border"
					style={{ animationDelay: "0.1s" }}
				>
					<p className="text-sm m-0 leading-relaxed" style={{ fontFamily: "'Lexend', sans-serif", fontWeight: 300 }}>
						Build{" "}
						<VSCodeLink className="inline" href="https://innovationlab.fetch.ai/resources/docs/agent-creation/uagent-creation">
							uAgents
						</VSCodeLink>
						, connect to{" "}
						<VSCodeLink className="inline" href="https://agentverse.ai">
							Agentverse
						</VSCodeLink>
						, generate images, search the web, and code <strong>any project</strong> with the world&apos;s first Web3-native LLM.
					</p>
				</div>

				{/* Doc pills */}
				<div className="flex gap-2 my-1 flex-wrap justify-center animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
					<DocPill href="https://innovationlab.fetch.ai/resources/docs/intro" label="Docs" icon="book" />
					<DocPill href="https://asi1.ai/dashboard/api-keys" label="API Key" icon="key" />
					<DocPill href="https://innovationlab.fetch.ai/resources/docs/agent-creation/uagent-creation" label="uAgents" icon="hubot" />
					<DocPill href="https://innovationlab.fetch.ai/resources/docs/mcp-integration/what-is-mcp" label="MCP" icon="server" />
				</div>

				{/* API key input + Go button */}
				<div className="mt-2 animate-fade-in-up" style={{ animationDelay: "0.3s" }}>
					<ApiOptions currentMode={mode} showModelOptions={false} />
					<button
						className="w-full mt-2 py-2.5 rounded-lg text-sm font-semibold cursor-pointer border-0 transition-all duration-300"
						disabled={disableLetsGoButton}
						onClick={handleSubmit}
						style={{
							fontFamily: "'Lexend', sans-serif",
							background: disableLetsGoButton
								? "var(--vscode-button-secondaryBackground)"
								: "linear-gradient(135deg, #06b6d4, #8b5cf6)",
							color: disableLetsGoButton ? "var(--vscode-button-secondaryForeground)" : "#fff",
							opacity: disableLetsGoButton ? 0.5 : 1,
							boxShadow: disableLetsGoButton ? "none" : "0 4px 20px rgba(6,182,212,0.3)",
						}}
					>
						Get Started
					</button>
				</div>
			</div>
		</div>
	);
});

const DocPill = ({ href, label, icon }: { href: string; label: string; icon: string }) => (
	<a
		href={href}
		className="glass glow-border flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full no-underline transition-all duration-200 hover:scale-105"
		style={{
			color: "var(--vscode-foreground)",
			fontFamily: "'Lexend', sans-serif",
			fontWeight: 400,
		}}
	>
		<i className={`codicon codicon-${icon} text-xs`} style={{ color: "#06b6d4" }} />
		{label}
	</a>
);

export default WelcomeView;
