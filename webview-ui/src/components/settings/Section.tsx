import type { HTMLAttributes } from "react"
import { cn } from "@/lib/utils"
import { settingsUi } from "./settingsUi"

type SectionProps = HTMLAttributes<HTMLDivElement>

export const Section = ({ className, ...props }: SectionProps) => (
	<div className={cn(settingsUi.sectionColumn, className)} {...props} />
)

export default Section
