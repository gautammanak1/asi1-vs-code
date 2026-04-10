import { EmptyRequest } from "@shared/proto/Asi/common";
import AsiLogoTired from "@/assets/FetchCoderLogoTired";
import AsiLogoVariable from "@/assets/FetchCoderLogoVariable";
import { useExtensionState } from "@/context/ExtensionStateContext";
import { UiServiceClient } from "@/services/grpc-client";

interface HomeHeaderProps {
	shouldShowQuickWins?: boolean;
}

const HomeHeader = ({ shouldShowQuickWins = false }: HomeHeaderProps) => {
	const { environment, lazyTeammateModeEnabled } = useExtensionState();

	const handleTakeATour = async () => {
		try {
			await UiServiceClient.openWalkthrough(EmptyRequest.create());
		} catch (error) {
			console.error("Error opening walkthrough:", error);
		}
	};

	const LogoComponent = lazyTeammateModeEnabled
		? AsiLogoTired
		: AsiLogoVariable;
	const headingText = lazyTeammateModeEnabled
		? "I guess I'm here to help"
		: "What can I build for you?";

	return (
		<div className="flex flex-col items-center mb-5 relative">
			{/* Ambient glow behind logo */}
			<div
				className="absolute top-4 w-40 h-40 rounded-full animate-glow-pulse pointer-events-none"
				style={{ background: "radial-gradient(circle, rgba(139,92,246,0.1) 0%, transparent 70%)", filter: "blur(30px)" }}
			/>

			<div className="my-7 animate-float relative z-10">
				<LogoComponent className="size-20 drop-shadow-lg" environment={environment} />
			</div>
			<div className="text-center flex items-center justify-center px-4">
				<h1
					className="m-0 font-bold text-xl"
					style={{
						fontFamily: "'Lexend', sans-serif",
						letterSpacing: "-0.03em",
						background: "linear-gradient(135deg, #e2e8f0, #ffffff, #cbd5e1)",
						WebkitBackgroundClip: "text",
						WebkitTextFillColor: "transparent",
					}}
				>
					{headingText}
				</h1>
			</div>
			{shouldShowQuickWins && (
				<div className="mt-4 animate-fade-in-up">
					<button
						className="glass glow-border flex items-center gap-2 px-5 py-2 rounded-full cursor-pointer text-sm font-medium transition-all duration-200 hover:scale-105"
						onClick={handleTakeATour}
						type="button"
						style={{ fontFamily: "'Lexend', sans-serif", color: "var(--vscode-foreground)", background: "transparent", border: "none" }}
					>
						Take a Tour
						<span className="codicon codicon-play scale-90" style={{ color: "#06b6d4" }} />
					</button>
				</div>
			)}
		</div>
	);
};

export default HomeHeader;
