import { EmptyRequest } from "@shared/proto/Asi/common";
import FetchCoderMark from "@/assets/FetchCoderMark";
import { useExtensionState } from "@/context/ExtensionStateContext";
import { UiServiceClient } from "@/services/grpc-client";

interface HomeHeaderProps {
	shouldShowQuickWins?: boolean;
}

/**
 * Welcome screen icons (visual):
 * - Fetch Coder mark: bundled logo (`FetchCoderMark` → PNG or SVG fallback)
 * - Feature chips: VS Code codicons `run`, `hubot`, `rocket`
 * - Quick actions (when `shouldShowQuickWins`): `codicon-play`, `codicon-settings`
 */
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
		<div className="relative flex flex-col items-center justify-center min-h-screen px-4 sm:px-6 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 overflow-hidden">
			{/* Animated Background Elements */}
			<div className="absolute inset-0 overflow-hidden pointer-events-none">
				<div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse opacity-50" />
				<div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl animate-pulse opacity-30" />
				<div className="absolute top-1/2 right-0 w-96 h-96 bg-blue-400/5 rounded-full blur-3xl opacity-20" />
			</div>

			{/* Main Content — staggered entrance (see `index.css` @layer utilities) */}
			<div className="relative z-10 flex flex-col items-center gap-8 max-w-2xl w-full">
				{/* Logo & Brand */}
				<div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-800/40 backdrop-blur-sm border border-slate-700/50 hover:border-blue-500/30 transition-all duration-300 animate-fade-in-up">
					<div className="relative group">
						<div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl blur opacity-30 group-hover:opacity-60 transition duration-300" />
						<div className="relative p-3 bg-slate-900 rounded-xl">
							<div className="animate-float">
								<FetchCoderMark
									className="size-12"
									environment={environment}
									variant={lazyTeammateModeEnabled ? "tired" : "variable"}
								/>
							</div>
						</div>
					</div>
					<div className="flex flex-col gap-0.5 min-w-0">
						<h2 className="text-xl font-bold bg-gradient-to-r from-blue-400 via-blue-500 to-purple-500 bg-clip-text text-transparent">
							Fetch Coder
						</h2>
						<p className="text-xs text-slate-400 font-medium">
							by <span className="text-blue-400 font-semibold">asi1.ai</span>
						</p>
					</div>
				</div>

				{/* Heading */}
				<div className="text-center space-y-3 px-4 animate-fade-in-up animate-delay-75">
					<h1 className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-white via-slate-100 to-slate-200 bg-clip-text text-transparent leading-tight tracking-tight">
						{headingText}
					</h1>
					<p className="text-lg sm:text-xl text-slate-300 font-medium max-w-xl mx-auto">
						Your autonomous AI coding partner, built for autonomous shipping
					</p>
				</div>

				{/* Feature chips — codicons (same font as editor) */}
				<div className="grid grid-cols-3 gap-3 mt-2 w-full max-w-sm">
					<div className="group flex flex-col items-center p-4 rounded-xl bg-slate-800/30 border border-slate-700/30 hover:border-blue-500/50 hover:bg-slate-800/50 transition-all duration-300 cursor-default animate-fade-in-up animate-delay-150">
						<span
							className="codicon codicon-run text-xl text-sky-400 mb-2"
							aria-hidden
						/>
						<p className="text-xs font-semibold text-slate-200 text-center leading-tight">
							Fast &amp; efficient
						</p>
					</div>
					<div className="group flex flex-col items-center p-4 rounded-xl bg-slate-800/30 border border-slate-700/30 hover:border-blue-500/50 hover:bg-slate-800/50 transition-all duration-300 cursor-default animate-fade-in-up animate-delay-225">
						<span
							className="codicon codicon-hubot text-xl text-violet-400 mb-2"
							aria-hidden
						/>
						<p className="text-xs font-semibold text-slate-200 text-center leading-tight">
							AI powered
						</p>
					</div>
					<div className="group flex flex-col items-center p-4 rounded-xl bg-slate-800/30 border border-slate-700/30 hover:border-blue-500/50 hover:bg-slate-800/50 transition-all duration-300 cursor-default animate-fade-in-up animate-delay-300">
						<span
							className="codicon codicon-rocket text-xl text-emerald-400 mb-2"
							aria-hidden
						/>
						<p className="text-xs font-semibold text-slate-200 text-center leading-tight">
							Ship faster
						</p>
					</div>
				</div>

				{/* CTAs */}
				{shouldShowQuickWins && (
					<div className="flex flex-col sm:flex-row gap-4 mt-4 w-full max-w-sm animate-fade-in">
						<button
							onClick={handleTakeATour}
							type="button"
							className="flex-1 relative group px-6 py-3 rounded-xl font-semibold text-white transition-all duration-300 hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-blue-500/50 overflow-hidden"
							style={{
								background: "linear-gradient(135deg, #0052FF 0%, #0041CC 100%)",
								boxShadow: "0 8px 16px rgba(0, 82, 255, 0.3)",
							}}
						>
							<div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
							<div className="relative flex items-center justify-center gap-2">
								<span className="codicon codicon-play text-sm" aria-hidden />
								<span>Take a Tour</span>
							</div>
						</button>
						<button
							type="button"
							className="flex-1 px-6 py-3 rounded-xl font-semibold text-slate-200 border border-slate-600/60 hover:border-blue-500/60 bg-slate-800/40 hover:bg-slate-800/80 transition-all duration-300 hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-blue-500/30"
						>
							<div className="flex items-center justify-center gap-2">
								<span className="codicon codicon-settings text-sm" aria-hidden />
								<span>Settings</span>
							</div>
						</button>
					</div>
				)}

				<div className="text-center text-xs text-slate-500 mt-4 max-w-sm animate-fade-in animate-delay-300">
					<p>
						{lazyTeammateModeEnabled
							? "Ready to help you write better code"
							: "Ready to build anything you imagine"}
					</p>
				</div>
			</div>
		</div>
	);
};

export default HomeHeader;
