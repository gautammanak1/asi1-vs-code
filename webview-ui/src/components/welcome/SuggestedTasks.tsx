import { NewTaskRequest } from "@shared/proto/Asi/task";
import React from "react";
import { TaskServiceClient } from "@/services/grpc-client";
import QuickWinCard from "./QuickWinCard";
import { QuickWinTask, quickWinTasks } from "./quickWinTasks";

export const SuggestedTasks: React.FC<{ shouldShowQuickWins: boolean }> = ({
	shouldShowQuickWins,
}) => {
	const handleExecuteQuickWin = async (prompt: string) => {
		await TaskServiceClient.newTask(
			NewTaskRequest.create({ text: prompt, images: [] }),
		);
	};

	if (shouldShowQuickWins) {
		return (
			<div className="px-4 pt-1 pb-3 select-none animate-fade-in-up">
				<h2
					className="text-sm font-medium mb-3 text-center"
					style={{
						fontFamily: "'Lexend', sans-serif",
						background: "linear-gradient(90deg, var(--vscode-descriptionForeground), var(--vscode-foreground), var(--vscode-descriptionForeground))",
						WebkitBackgroundClip: "text",
						WebkitTextFillColor: "transparent",
					}}
				>
					Get Started with Fetch Coder
				</h2>
				<div className="flex flex-col space-y-1.5">
					{quickWinTasks.map((task: QuickWinTask, i: number) => (
						<div key={task.id} style={{ animationDelay: `${i * 0.08}s` }} className="animate-fade-in-up">
							<QuickWinCard
								onExecute={() => handleExecuteQuickWin(task.prompt)}
								task={task}
							/>
						</div>
					))}
				</div>
			</div>
		);
	}
};
