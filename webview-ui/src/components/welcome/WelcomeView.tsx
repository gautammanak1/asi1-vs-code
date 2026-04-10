import { BooleanRequest } from "@shared/proto/Asi/common";
import { memo, useEffect, useState } from "react";
import FetchCoderMark from "@/assets/FetchCoderMark";
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
		<div className="fixed inset-0 p-0 flex flex-col" style={{ background: "#282828" }}>
			<div className="h-full px-5 overflow-auto flex flex-col gap-3 relative z-10">
				<div className="flex flex-col items-center mt-10 mb-4 animate-fade-in-up">
					<div className="animate-float mb-4">
						<FetchCoderMark className="size-14" variant="white" />
					</div>
					<h2
						className="text-3xl font-extrabold m-0"
						style={{ fontFamily: "'Lexend', sans-serif", color: "#ffffff", letterSpacing: "-0.04em" }}
					>
						Fetch Coder
					</h2>
					<p className="text-sm m-0 mt-3 max-w-[300px] text-center leading-relaxed" style={{ color: "#999", fontFamily: "'Lexend', sans-serif", fontWeight: 300 }}>
						Your AI partners with you. It writes code, debugs, and ships — so you can focus on what matters.
					</p>
				</div>

				<div
					className="rounded-xl px-4 py-3 my-1 text-center"
					style={{ background: "#333", border: "1px solid #444" }}
				>
					<p className="text-xs m-0 leading-relaxed" style={{ color: "#bbb", fontFamily: "'Lexend', sans-serif" }}>
						HTML · CSS · JS · React · Next.js · Python · uAgents · any stack
					</p>
				</div>

				<div className="flex gap-2 my-1 flex-wrap justify-center animate-fade-in-up" style={{ animationDelay: "0.15s" }}>
					<Pill href="https://asi1.ai/dashboard/api-keys" label="Get API Key" />
					<Pill href="https://agentverse.ai" label="Agentverse" />
					<Pill href="https://innovationlab.fetch.ai/resources/docs/intro" label="Docs" />
				</div>

				<div className="mt-2 animate-fade-in-up" style={{ animationDelay: "0.25s" }}>
					<ApiOptions currentMode={mode} showModelOptions={false} />
					<button
						className="w-full mt-2.5 py-3 rounded-xl text-sm font-bold cursor-pointer border-0 transition-all duration-200"
						disabled={disableLetsGoButton}
						onClick={handleSubmit}
						style={{
							fontFamily: "'Lexend', sans-serif",
							background: disableLetsGoButton ? "#444" : "#7CE074",
							color: disableLetsGoButton ? "#888" : "#1a1a1a",
							opacity: disableLetsGoButton ? 0.6 : 1,
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
		style={{ background: "#333", border: "1px solid #444", color: "#ccc", fontFamily: "'Lexend', sans-serif" }}
	>
		{label}
	</a>
);

export default WelcomeView;
