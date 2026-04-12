import { StringArrayRequest } from "@shared/proto/Asi/common";
import { Button } from "@/components/ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { TaskServiceClient } from "@/services/grpc-client";
import { formatSize } from "@/utils/format";

const DeleteTaskButton: React.FC<{
	taskId?: string;
	taskSize?: number;
	className?: string;
}> = ({ taskId, className, taskSize }) => (
	<Tooltip>
		<TooltipContent>{`Delete Task (size: ${taskSize ? formatSize(taskSize) : "--"})`}</TooltipContent>
		<TooltipTrigger className={cn("flex items-center", className)}>
			<Button
				aria-label="Delete Task"
				disabled={!taskId}
				onClick={(e) => {
					e.preventDefault();
					e.stopPropagation();
					taskId &&
						TaskServiceClient.deleteTasksWithIds(
							StringArrayRequest.create({ value: [taskId] }),
						);
				}}
				size="xs"
				variant="icon"
			>
				<span className="codicon codicon-trash" style={{ fontSize: "15px" }} />
			</Button>
		</TooltipTrigger>
	</Tooltip>
);
DeleteTaskButton.displayName = "DeleteTaskButton";

export default DeleteTaskButton;
