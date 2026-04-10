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
		<div className="fixed inset-0 p-0 flex flex-col" style={{ background: "#0a0a0a" }}>
			<div className="h-full px-5 overflow-auto flex flex-col gap-3 relative z-10">
				{/* Logo + Title */}
				<div className="flex flex-col items-center mt-10 mb-4 animate-fade-in-up">
					<div className="animate-float mb-4">
						<AsiLogoWhite className="size-14 drop-shadow-lg" />
					</div>
					<h2
						className="text-3xl font-extrabold m-0 tracking-tight"
						style={{ fontFamily: "'Lexend', sans-serif", color: "#ffffff", letterSpacing: "-0.04em" }}
					>
						Fetch Coder
					</h2>
					<p className="text-sm m-0 mt-2 max-w-[280px] text-center leading-relaxed" style={{ color: "#a1a1aa", fontFamily: "'Lexend', sans-serif", fontWeight: 300 }}>
						Your AI coding partner. It writes code so you can ship faster.
					</p>
				</div>

				{/* Feature card */}
				<div
					className="rounded-xl px-4 py-3 my-1 text-center"
					style={{ background: "#18181b", border: "1px solid #27272a" }}
				>
					<p className="text-xs m-0 leading-relaxed" style={{ color: "#a1a1aa", fontFamily: "'Lexend', sans-serif" }}>
						Build{" "}
						<VSCodeLink className="inline" href="https://innovationlab.fetch.ai/resources/docs/agent-creation/uagent-creation">
							uAgents
						</VSCodeLink>
						{" · "}
						<VSCodeLink className="inline" href="https://agentverse.ai">
							Agentverse
						</VSCodeLink>
						{" · "}React{" · "}Next.js{" · "}Python{" · "}any stack
					</p>
				</div>

				{/* Doc pills */}
				<div className="flex gap-2 my-1 flex-wrap justify-center animate-fade-in-up" style={{ animationDelay: "0.15s" }}>
					<Pill href="https://innovationlab.fetch.ai/resources/docs/intro" label="Docs" />
					<Pill href="https://asi1.ai/dashboard/api-keys" label="API Key" />
					<Pill href="https://agentverse.ai" label="Agentverse" />
					<Pill href="https://innovationlab.fetch.ai/resources/docs/mcp-integration/what-is-mcp" label="MCP" />
				</div>

				{/* API key input + Go button */}
				<div className="mt-2 animate-fade-in-up" style={{ animationDelay: "0.25s" }}>
					<ApiOptions currentMode={mode} showModelOptions={false} />
					<button
						className="w-full mt-2.5 py-3 rounded-xl text-sm font-bold cursor-pointer border-0 transition-all duration-200"
						disabled={disableLetsGoButton}
						onClick={handleSubmit}
						style={{
							fontFamily: "'Lexend', sans-serif",
							background: disableLetsGoButton ? "#27272a" : "#a3e635",
							color: disableLetsGoButton ? "#71717a" : "#0a0a0a",
							opacity: disableLetsGoButton ? 0.6 : 1,
							letterSpacing: "-0.01em",
						}}
					>
						Get Started &rarr;
					</button>
				</div>
			</div>
		</div>
	);
});

const Pill = ({ href, label }: { href: string; label: string }) => (
	<a
		href={href}
		className="flex items-center text-xs px-3 py-1.5 rounded-full no-underline transition-all duration-200 hover:scale-105"
		style={{
			background: "#18181b",
			border: "1px solid #27272a",
			color: "#d4d4d8",
			fontFamily: "'Lexend', sans-serif",
			fontWeight: 400,
		}}
	>
		{label}
	</a>
);

export default WelcomeView;
