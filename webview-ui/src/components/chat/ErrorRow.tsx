import { AsiMessage } from "@shared/ExtensionMessage"
import { memo } from "react"
import { AsiError, AsiErrorType } from "../../../../src/services/error/ClineError"

const _errorColor = "var(--vscode-errorForeground)"

interface ErrorRowProps {
	message: AsiMessage
	errorType: "error" | "mistake_limit_reached" | "diff_error" | "Asiignore_error"
	apiRequestFailedMessage?: string
	apiReqStreamingFailedMessage?: string
}

const ErrorRow = memo(({ message, errorType, apiRequestFailedMessage, apiReqStreamingFailedMessage }: ErrorRowProps) => {
	const rawApiError = apiRequestFailedMessage || apiReqStreamingFailedMessage

	const renderErrorContent = () => {
		switch (errorType) {
			case "error":
			case "mistake_limit_reached":
				// Handle API request errors with special error parsing
				if (rawApiError) {
					// FIXME: AsiError parsing should not be applied to non-Asi providers, but it seems we're using AsiErrorMessage below in the default error display
					const parsedAsiError = AsiError.parse(rawApiError)
					const errorMessage = parsedAsiError?._error?.message || parsedAsiError?.message || rawApiError
					const requestId = parsedAsiError?._error?.request_id
					const providerId = parsedAsiError?.providerId || parsedAsiError?._error?.providerId
					const errorCode = parsedAsiError?._error?.code

					if (parsedAsiError?.isErrorType(AsiErrorType.Balance)) {
						const errorMessage =
							parsedAsiError._error?.details?.message ||
							parsedAsiError?._error?.message ||
							parsedAsiError?.message ||
							rawApiError
						return (
							<div className="flex flex-col gap-2">
								<p className="m-0 whitespace-pre-wrap text-error wrap-anywhere">{errorMessage}</p>
								<p className="text-description text-sm m-0">
									Check your ASI:One API key, plan limits, and model settings in Fetch Coder Settings.
								</p>
							</div>
						)
					}

					if (parsedAsiError?.isErrorType(AsiErrorType.RateLimit)) {
						return (
							<p className="m-0 whitespace-pre-wrap text-error wrap-anywhere">
								{errorMessage}
								{requestId && <div>Request ID: {requestId}</div>}
							</p>
						)
					}

					if (parsedAsiError?.isErrorType(AsiErrorType.Auth)) {
						return (
							<div className="flex flex-col gap-3">
								<p className="m-0 whitespace-pre-wrap text-error wrap-anywhere">{errorMessage}</p>
								<p className="text-description text-sm m-0">
									Check your provider API key, base URL, and model in Fetch Coder Settings.
								</p>
								{requestId ? <p className="text-description text-sm m-0">Request ID: {requestId}</p> : null}
							</div>
						)
					}

					return (
						<p className="m-0 whitespace-pre-wrap text-error wrap-anywhere flex flex-col gap-3">
							{/* Display the well-formatted error extracted from the AsiError instance */}

							<header>
								{providerId && <span className="uppercase">[{providerId}] </span>}
								{errorCode && <span>{errorCode}</span>}
								{errorMessage}
								{requestId && <div>Request ID: {requestId}</div>}
							</header>

							{/* Windows Powershell Issue */}
							{errorMessage?.toLowerCase()?.includes("powershell") && (
								<div>
									It seems like you're having Windows PowerShell issues, please see this{" "}
									<a
										className="underline text-inherit"
										href="https://github.com/gautammanak1/asi1-vs-code/wiki/TroubleShooting-%E2%80%90-%22PowerShell-is-not-recognized-as-an-internal-or-external-command%22">
										troubleshooting guide
									</a>
									.
								</div>
							)}

							{/* Display raw API error if different from parsed error message */}
							{errorMessage !== rawApiError && <div>{rawApiError}</div>}

							<div className="mt-4">
								<span className="text-description">(Click "Retry" below)</span>
							</div>
						</p>
					)
				}

				// Regular error message
				return <p className="m-0 mt-0 whitespace-pre-wrap text-error wrap-anywhere">{message.text}</p>

			case "diff_error":
				return (
					<div className="flex flex-col p-2 rounded text-xs opacity-80 bg-quote text-foreground">
						<div>The model used search patterns that don't match anything in the file. Retrying...</div>
					</div>
				)

			case "Asiignore_error":
				return (
					<div className="flex flex-col p-2 rounded text-xs opacity-80 bg-quote text-foreground">
						<div>
							Fetch Coder tried to access <code>{message.text}</code> which is blocked by the <code>.Asiignore</code>
							file.
						</div>
					</div>
				)

			default:
				return null
		}
	}

	// For diff_error and Asiignore_error, we don't show the header separately
	if (errorType === "diff_error" || errorType === "Asiignore_error") {
		return renderErrorContent()
	}

	// For other error types, show header + content
	return renderErrorContent()
})

export default ErrorRow
