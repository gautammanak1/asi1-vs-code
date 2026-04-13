import type { HTMLAttributes } from "react"
import { cn } from "@/lib/utils"

type SectionHeaderProps = HTMLAttributes<HTMLDivElement> & {
	children: React.ReactNode
	description?: string
}

export const SectionHeader = ({
	description,
	children,
	className,
	...props
}: SectionHeaderProps) => {
	return (
		<div
			className={cn(
				"border-b border-(--vscode-widget-border) bg-(--vscode-editor-background) px-5 pt-6 pb-4",
				className,
			)}
			{...props}
		>
			<h2 className="m-0 flex items-center gap-2 text-lg font-semibold tracking-tight text-(--vscode-foreground)">
				{children}
			</h2>
			{description ? (
				<p className="mb-0 mt-2 text-sm leading-relaxed text-(--vscode-descriptionForeground)">
					{description}
				</p>
			) : null}
		</div>
	)
}

export default SectionHeader
