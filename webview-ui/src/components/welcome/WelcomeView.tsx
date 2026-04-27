import { BooleanRequest } from "@shared/proto/Asi/common";
import { memo, useEffect, useState } from "react";
import ApiOptions from "@/components/settings/ApiOptions";
import { useExtensionState } from "@/context/ExtensionStateContext";
import { StateServiceClient } from "@/services/grpc-client";
import { validateApiConfiguration } from "@/utils/validate";
import { asiDebug } from "@/utils/debug";

const WelcomeView = memo(() => {
	const { apiConfiguration, mode, hostAppKind } = useExtensionState();
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
			asiDebug.error(
				"Failed to update API configuration or complete welcome view:",
				error,
			);
		}
	};

	useEffect(() => {
		setApiErrorMessage(validateApiConfiguration(mode, apiConfiguration));
	}, [apiConfiguration, mode]);

	return (
		<div className="fixed inset-0 flex flex-col overflow-hidden bg-background">
			<div className="h-full overflow-y-auto overflow-x-hidden px-5 py-8">
				<div className="mx-auto flex w-full max-w-md flex-col gap-6">
					<div className="text-center">
						<h2
							className="m-0 text-3xl font-bold tracking-tight"
							style={{ color: "var(--color-cursor-primary, var(--color-Asi))" }}
						>
							{hostAppKind === "cursor"
								? "Fetch Coder for Cursor"
								: "Fetch Coder"}
						</h2>
						<p className="m-0 mt-1 text-xs text-muted-foreground">
							Powered by ASI:One — same API key as api.asi1.ai
						</p>
						<p className="m-0 mt-4 text-sm leading-relaxed text-muted-foreground">
							{hostAppKind === "cursor"
								? "Connect your ASI:One API key. This sidebar is separate from the editor’s own chat; use Settings to tweak accents."
								: hostAppKind === "vscode"
									? "Connect your ASI:One API key. Works in Visual Studio Code and other VS Code–compatible hosts."
									: "Connect your ASI:One API key. Set fetchCoder.hostApp in Settings if the wrong host is detected."}
						</p>
					</div>

					<div className="rounded-md border border-border bg-card px-4 py-3 text-center">
						<p className="m-0 text-xs leading-relaxed text-muted-foreground">
							HTML · CSS · JS · React · Python · uAgents · any stack
						</p>
					</div>

					<div className="flex flex-wrap justify-center gap-2">
						<Pill href="https://asi1.ai/dashboard/api-keys" label="Get API Key" />
						<Pill href="https://agentverse.ai" label="Agentverse" />
						<Pill
							href="https://innovationlab.fetch.ai/resources/docs/intro"
							label="Docs"
						/>
					</div>

					<div className="space-y-3">
						<div className="rounded-md border border-border bg-card p-4">
							<ApiOptions
								apiErrorMessage={apiErrorMessage}
								currentMode={mode}
								showModelOptions={false}
							/>
						</div>
						<button
							className="w-full rounded-md border-0 py-3 text-sm font-semibold text-[#0a0a0a] transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[var(--color-cursor-primary)] disabled:cursor-not-allowed disabled:opacity-60"
							disabled={disableLetsGoButton}
							onClick={handleSubmit}
							type="button"
							style={{
								background: disableLetsGoButton
									? "var(--color-muted)"
									: "var(--color-fetch-lime, #7ce074)",
							}}
						>
							Get Started →
						</button>
					</div>
				</div>
			</div>
		</div>
	);
});

const Pill = ({ href, label }: { href: string; label: string }) => (
	<a
		className="rounded-full border border-border bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-foreground no-underline hover:bg-muted"
		href={href}
		rel="noreferrer"
		target="_blank"
	>
		{label}
	</a>
);

export default WelcomeView;
