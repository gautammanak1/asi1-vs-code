import { EmptyRequest } from "@shared/proto/Asi/common";
import { useExtensionState } from "@/context/ExtensionStateContext";
import { UiServiceClient } from "@/services/grpc-client";

interface HomeHeaderProps {
	shouldShowQuickWins?: boolean;
}

/** Minimal welcome header — no hero icons, gradients, or motion (avoids webview overlap glitches). */
const HomeHeader = ({ shouldShowQuickWins = false }: HomeHeaderProps) => {
	const { lazyTeammateModeEnabled, navigateToSettings } = useExtensionState();

	const handleTakeATour = async () => {
		try {
			await UiServiceClient.openWalkthrough(EmptyRequest.create());
		} catch (error) {
			console.error("Error opening walkthrough:", error);
		}
	};

	const headingText = lazyTeammateModeEnabled
		? "I guess I'm here to help"
		: "What can I build for you?";

	return (
		<div className="flex min-h-screen flex-col items-center justify-center px-4 py-10 bg-background">
			<div className="flex w-full max-w-lg flex-col items-center gap-6 text-center">
				<div>
					<h2
						className="m-0 text-6xl font-bold tracking-tight sm:text-8xl"
						style={{ color: "#85F47C" }}
					>
						Fetch Coder
					</h2>
					<p className="m-0 mt-1 text-xs text-muted-foreground">by asi1.ai</p>
				</div>

				<div className="space-y-2">
					<h1 className="m-0 text-2xl font-semibold leading-snug text-foreground sm:text-3xl">
						{headingText}
					</h1>
					<p className="m-0 max-w-md text-sm leading-relaxed text-muted-foreground">
						Your AI coding partner for this workspace — edit, run, and ship tasks with
						you.
					</p>
				</div>

				{shouldShowQuickWins && (
					<div className="mt-2 flex w-full max-w-sm flex-col gap-2 sm:flex-row sm:justify-center">
						<button
							className="rounded-md px-4 py-2.5 text-sm font-medium text-primary-foreground bg-primary hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-ring"
							onClick={handleTakeATour}
							type="button"
						>
							Take a Tour
						</button>
						<button
							className="rounded-md border border-border bg-secondary px-4 py-2.5 text-sm font-medium text-secondary-foreground hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring"
							onClick={() => navigateToSettings()}
							type="button"
						>
							Settings
						</button>
					</div>
				)}

				<p className="m-0 text-xs text-muted-foreground">
					{lazyTeammateModeEnabled
						? "Ready to help you write better code."
						: "Ready when you are."}
				</p>
			</div>
		</div>
	);
};

export default HomeHeader;
