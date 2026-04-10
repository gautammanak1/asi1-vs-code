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
		<div className="flex flex-col items-center mb-5 relative">
			<div className="my-7 animate-float relative z-10">
				<FetchCoderMark
					className="size-16"
					environment={environment}
					variant={lazyTeammateModeEnabled ? "tired" : "variable"}
				/>
			</div>
			<div className="text-center flex items-center justify-center px-4">
				<h1
					className="m-0 font-extrabold text-xl"
					style={{ fontFamily: "'Lexend', sans-serif", color: "#ffffff", letterSpacing: "-0.03em" }}
				>
					{headingText}
				</h1>
			</div>
			{shouldShowQuickWins && (
				<div className="mt-4 animate-fade-in-up">
					<button
						className="flex items-center gap-2 px-5 py-2 rounded-full cursor-pointer text-sm font-medium transition-all duration-200 hover:scale-105"
						onClick={handleTakeATour}
						type="button"
						style={{ fontFamily: "'Lexend', sans-serif", background: "#333", border: "1px solid #444", color: "#ccc" }}
					>
						Take a Tour
						<span className="codicon codicon-play scale-90" style={{ color: "#7CE074" }} />
					</button>
				</div>
			)}
		</div>
	);
};

export default HomeHeader;
