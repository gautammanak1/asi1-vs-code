import { AsiMessage } from "@shared/ExtensionMessage"
import { memo } from "react"
import { AsiError, AsiErrorType } from "../../../../src/services/error/ClineError"

const _errorColor = "var(--vscode-errorForeground)"

/** True when the string looks like JSON from our extension/API (show structured header). Plain text stays a simple message. */
function isStructuredSerializedError(raw: string): boolean {
	const t = raw.trim()
	if (!t.startsWith("{")) {
		return false
	}
	try {
		const o = JSON.parse(t) as unknown
		return (
			typeof o === "object" &&
			o !== null &&
			("message" in (o as object) || "_error" in (o as object) || "providerId" in (o as object))
		)
	} catch {
		return false
	}
}

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
					const parsedAsiError = AsiError.parse(rawApiError)
					const errorMessage = parsedAsiError?._error?.message || parsedAsiError?.message || rawApiError
					const requestId = parsedAsiError?._error?.request_id
					const providerId = parsedAsiError?.providerId || parsedAsiError?._error?.providerId
					const errorCode = parsedAsiError?._error?.code
					const showStructuredHeader = isStructuredSerializedError(rawApiError)

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

					if (!showStructuredHeader) {
						return (
							<p className="m-0 whitespace-pre-wrap text-error wrap-anywhere">
								{errorMessage}
								{errorMessage?.toLowerCase()?.includes("powershell") && (
									<span className="block mt-2 text-description text-sm">
										See the{" "}
										<a
											className="underline text-inherit"
											href="https://github.com/gautammanak1/asi1-vs-code/wiki/TroubleShooting-%E2%80%90-%22PowerShell-is-not-recognized-as-an-internal-or-external-command%22">
											PowerShell troubleshooting guide
										</a>
										.
									</span>
								)}
								<span className="block mt-3 text-description text-sm">(Click &quot;Retry&quot; below)</span>
							</p>
						)
					}

					return (
						<p className="m-0 whitespace-pre-wrap text-error wrap-anywhere flex flex-col gap-3">
							<header>
								{providerId && <span className="uppercase">[{providerId}] </span>}
								{errorCode && <span>{errorCode}</span>}
								{errorMessage}
								{requestId && <div>Request ID: {requestId}</div>}
							</header>

							{errorMessage?.toLowerCase()?.includes("powershell") && (
								<div>
									It seems like you&apos;re having Windows PowerShell issues; see this{" "}
									<a
										className="underline text-inherit"
										href="https://github.com/gautammanak1/asi1-vs-code/wiki/TroubleShooting-%E2%80%90-%22PowerShell-is-not-recognized-as-an-internal-or-external-command%22">
										troubleshooting guide
									</a>
									.
								</div>
							)}

							{errorMessage !== rawApiError && <div>{rawApiError}</div>}

							<div className="mt-4">
								<span className="text-description">(Click &quot;Retry&quot; below)</span>
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
