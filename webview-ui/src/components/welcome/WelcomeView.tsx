import { BooleanRequest } from "@shared/proto/Asi/common"
import { VSCodeButton, VSCodeLink } from "@vscode/webview-ui-toolkit/react"
import { memo, useEffect, useState } from "react"
import AsiLogoWhite from "@/assets/ClineLogoWhite"
import ApiOptions from "@/components/settings/ApiOptions"
import { useExtensionState } from "@/context/ExtensionStateContext"
import { StateServiceClient } from "@/services/grpc-client"
import { validateApiConfiguration } from "@/utils/validate"

const WelcomeView = memo(() => {
	const { apiConfiguration, mode } = useExtensionState()
	const [apiErrorMessage, setApiErrorMessage] = useState<string | undefined>(undefined)

	const disableLetsGoButton = apiErrorMessage != null

	const handleSubmit = async () => {
		try {
			await StateServiceClient.setWelcomeViewCompleted(BooleanRequest.create({ value: true }))
		} catch (error) {
			console.error("Failed to update API configuration or complete welcome view:", error)
		}
	}

	useEffect(() => {
		setApiErrorMessage(validateApiConfiguration(mode, apiConfiguration))
	}, [apiConfiguration, mode])

	return (
		<div className="fixed inset-0 p-0 flex flex-col">
			<div className="h-full px-5 overflow-auto flex flex-col gap-2.5">
				<h2 className="text-lg font-semibold">Welcome to Fetch Coder</h2>
				<p className="text-xs text-(--vscode-descriptionForeground) m-0">
					Local POC — not affiliated with upstream Asi.
				</p>
				<div className="flex justify-center my-5">
					<AsiLogoWhite className="size-16" />
				</div>
				<p>
					Fetch Coder uses the{" "}
					<VSCodeLink className="inline" href="https://docs.asi1.ai/documentation/getting-started/overview">
						ASI:One
					</VSCodeLink>{" "}
					API. Add your API key below — endpoint and model are fixed for ASI:One.
				</p>

				<div className="mt-4.5">
					<ApiOptions currentMode={mode} showModelOptions={false} />
					<VSCodeButton className="mt-0.75 w-full" disabled={disableLetsGoButton} onClick={handleSubmit}>
						Let&apos;s go!
					</VSCodeButton>
				</div>
			</div>
		</div>
	)
})

export default WelcomeView
