import { VSCodeButton } from "@vscode/webview-ui-toolkit/react"
import { useExtensionState } from "@/context/ExtensionStateContext"
import AsiLogoVariable from "../../assets/ClineLogoVariable"

export const AccountWelcomeView = () => {
	const { environment, navigateToSettings } = useExtensionState()

	const openApiSettings = () => {
		navigateToSettings()
	}

	return (
		<div className="flex flex-col items-center gap-2.5">
			<AsiLogoVariable className="size-16 mb-4" environment={environment} />

			<p className="text-center m-0 px-1">
				Fetch Coder uses your ASI:One API key from Settings. You don&apos;t need a separate cloud sign-in to use the
				extension.
			</p>

			<VSCodeButton className="w-full mb-2" onClick={openApiSettings}>
				Open API settings
			</VSCodeButton>
		</div>
	)
}
