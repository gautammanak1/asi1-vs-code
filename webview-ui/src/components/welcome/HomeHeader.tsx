import { EmptyRequest } from "@shared/proto/Asi/common";
import FetchCoderMark from "@/assets/FetchCoderMark";
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

	const headingText = lazyTeammateModeEnabled
		? "I guess I'm here to help"
		: "What can I build for you?";

	return (
		<div className="flex flex-col items-center mb-8 relative">
			{/* Logo & Branding */}
			<div className="mb-6">
				<div className="flex items-center justify-center gap-3">
					<div className="my-4 animate-float relative z-10">
						<FetchCoderMark
							className="size-14"
							environment={environment}
							variant={lazyTeammateModeEnabled ? "tired" : "variable"}
						/>
					</div>
					<div className="flex flex-col justify-start">
						<h2 
							className="text-lg font-bold m-0 leading-tight"
							style={{ color: "#0052FF" }}
						>
							Fetch Coder
						</h2>
						<p 
							className="text-xs m-0 leading-tight"
							style={{ color: "#888" }}
						>
							by <span className="font-semibold">asi1.ai</span>
						</p>
					</div>
				</div>
			</div>

			{/* Main Heading */}
			<div className="text-center flex items-center justify-center px-4 mb-2">
				<h1
					className="m-0 font-extrabold text-2xl leading-tight"
					style={{ 
						fontFamily: "'Lexend', sans-serif", 
						color: "#ffffff", 
						letterSpacing: "-0.03em",
						background: "linear-gradient(135deg, #ffffff 0%, #e0e0e0 100%)",
						WebkitBackgroundClip: "text",
						WebkitTextFillColor: "transparent",
						backgroundClip: "text"
					}}
				>
					{headingText}
				</h1>
			</div>

			{/* Subtitle */}
			<p 
				className="text-sm px-4 text-center mt-2"
				style={{ color: "#aaa", fontFamily: "'Lexend', sans-serif" }}
			>
				Your autonomous AI coding partner
			</p>

			{/* CTA Buttons */}
			{shouldShowQuickWins && (
				<div className="mt-6 flex gap-3 animate-fade-in-up">
					<button
						className="flex items-center gap-2 px-5 py-2.5 rounded-lg cursor-pointer text-sm font-semibold transition-all duration-200 hover:scale-105 hover:shadow-lg"
						onClick={handleTakeATour}
						type="button"
						style={{ 
							fontFamily: "'Lexend', sans-serif", 
							background: "linear-gradient(135deg, #0052FF 0%, #0041CC 100%)",
							border: "none",
							color: "#ffffff",
							boxShadow: "0 4px 12px rgba(0, 82, 255, 0.3)"
						}}
					>
						<span className="codicon codicon-play scale-90" />
						Take a Tour
					</button>
					<button
						className="flex items-center gap-2 px-5 py-2.5 rounded-lg cursor-pointer text-sm font-semibold transition-all duration-200 hover:scale-105"
						type="button"
						style={{ 
							fontFamily: "'Lexend', sans-serif", 
							background: "transparent",
							border: "1px solid #444",
							color: "#aaa"
						}}
					>
						<span className="codicon codicon-settings scale-90" />
						Settings
					</button>
				</div>
			)}
		</div>
	);
};

export default HomeHeader;
