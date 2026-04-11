import { BooleanRequest } from "@shared/proto/Asi/common";
import { memo, useEffect, useState } from "react";
import FetchCoderMark from "@/assets/FetchCoderMark";
import ApiOptions from "@/components/settings/ApiOptions";
import { useExtensionState } from "@/context/ExtensionStateContext";
import { StateServiceClient } from "@/services/grpc-client";
import { validateApiConfiguration } from "@/utils/validate";

const WelcomeView = memo(() => {
	const { apiConfiguration, mode, environment } = useExtensionState();
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
		<div className="fixed inset-0 flex flex-col overflow-hidden bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
			{/* Match HomeHeader: soft gradient orbs */}
			<div className="absolute inset-0 overflow-hidden pointer-events-none">
				<div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse opacity-50" />
				<div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl animate-pulse opacity-30" />
				<div className="absolute top-1/2 right-0 w-72 h-72 bg-blue-400/5 rounded-full blur-3xl opacity-20" />
			</div>

			<div className="relative z-10 h-full overflow-y-auto overflow-x-hidden px-4 sm:px-6 py-8 pb-12">
				<div className="mx-auto flex w-full max-w-md flex-col gap-6">
					{/* Logo + title — same language as HomeHeader */}
					<div className="flex flex-col items-center gap-6">
						<div className="flex w-full items-center gap-4 rounded-2xl border border-slate-700/50 bg-slate-800/40 p-4 backdrop-blur-sm transition-all duration-300 animate-fade-in-up hover:border-blue-500/30">
							<div className="relative shrink-0 group">
								<div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 opacity-30 blur transition duration-300 group-hover:opacity-60" />
								<div className="relative rounded-xl bg-slate-900 p-3">
									<div className="animate-float">
										<FetchCoderMark
											className="size-14"
											environment={environment}
											variant="variable"
										/>
									</div>
								</div>
							</div>
							<div className="min-w-0 flex-1">
								<h2 className="m-0 bg-gradient-to-r from-blue-400 via-blue-500 to-purple-500 bg-clip-text text-xl font-bold text-transparent">
									Fetch Coder
								</h2>
								<p className="mt-0.5 text-xs font-medium text-slate-400">
									by{" "}
									<span className="font-semibold text-blue-400">asi1.ai</span>
								</p>
							</div>
						</div>

						<div className="w-full space-y-3 px-1 text-center animate-fade-in-up animate-delay-75">
							<p className="m-0 text-sm font-medium leading-relaxed text-slate-300">
								Your AI partners with you. It writes code, debugs, and ships — so
								you can focus on what matters.
							</p>
						</div>
					</div>

					{/* Stack strip */}
					<div className="rounded-xl border border-slate-700/40 bg-slate-800/30 px-4 py-3 text-center backdrop-blur-sm animate-fade-in-up animate-delay-150">
						<p className="m-0 text-xs leading-relaxed text-slate-400">
							HTML · CSS · JS · React · Next.js · Python · uAgents · any stack
						</p>
					</div>

					{/* Links */}
					<div className="flex flex-wrap justify-center gap-2 animate-fade-in-up animate-delay-150">
						<Pill href="https://asi1.ai/dashboard/api-keys" label="Get API Key" />
						<Pill href="https://agentverse.ai" label="Agentverse" />
						<Pill
							href="https://innovationlab.fetch.ai/resources/docs/intro"
							label="Docs"
						/>
					</div>

					{/* API key + CTA */}
					<div className="space-y-3 animate-fade-in-up animate-delay-225">
						<div className="rounded-2xl border border-slate-700/50 bg-slate-800/40 p-4 backdrop-blur-sm">
							<ApiOptions
								apiErrorMessage={apiErrorMessage}
								currentMode={mode}
								showModelOptions={false}
							/>
						</div>
						<button
							className="w-full rounded-xl border-0 py-3.5 text-sm font-bold transition-all duration-200 hover:scale-[1.01] focus:outline-none focus:ring-2 focus:ring-emerald-400/40 disabled:cursor-not-allowed disabled:hover:scale-100"
							disabled={disableLetsGoButton}
							onClick={handleSubmit}
							type="button"
							style={{
								background: disableLetsGoButton ? "#3f3f46" : "#7CE074",
								color: disableLetsGoButton ? "#a1a1aa" : "#1a1a1a",
								opacity: disableLetsGoButton ? 0.75 : 1,
							}}
						>
							Get Started &rarr;
						</button>
					</div>
				</div>
			</div>
		</div>
	);
});

const Pill = ({ href, label }: { href: string; label: string }) => (
	<a
		className="flex items-center rounded-full border border-slate-600/60 bg-slate-800/50 px-3 py-1.5 text-xs font-medium text-slate-200 no-underline transition-all duration-200 hover:scale-105 hover:border-blue-500/50 hover:bg-slate-800/80"
		href={href}
		rel="noreferrer"
		target="_blank"
	>
		{label}
	</a>
);

export default WelcomeView;
