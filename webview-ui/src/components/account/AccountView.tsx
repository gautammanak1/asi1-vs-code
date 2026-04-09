import type { UserOrganization } from "@shared/proto/asi/account"
import type { RemoteConfigFields } from "@shared/storage/state-keys"
import { VSCodeButton, VSCodeDropdown, VSCodeOption, VSCodeTag } from "@vscode/webview-ui-toolkit/react"
import { memo, useCallback, useEffect, useState } from "react"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { handleSignOut, useAsiAuth } from "@/context/AsiAuthContext"
import { useExtensionState } from "@/context/ExtensionStateContext"
import { AccountServiceClient } from "@/services/grpc-client"
import ViewHeader from "../common/ViewHeader"
import { AccountWelcomeView } from "./AccountWelcomeView"
import { getMainRole } from "./helpers"
import { RemoteConfigToggle } from "./RemoteConfigToggle"

type AccountViewProps = {
	onDone: () => void
}

/**
 * Account screen: identity + org switch + remote-config opt-out. No credits, billing, or usage tables (Fetch Coder / ASI:One POC).
 */
const AccountView = ({ onDone }: AccountViewProps) => {
	const { AsiUser, organizations: userOrganizations, activeOrganization } = useAsiAuth()
	const { environment, remoteConfigSettings, navigateToSettings } = useExtensionState()

	const openApiSettings = useCallback(() => {
		navigateToSettings()
	}, [navigateToSettings])

	if (!AsiUser?.uid) {
		return (
			<div className="fixed inset-0 flex flex-col overflow-hidden">
				<ViewHeader environment={environment} onDone={onDone} showEnvironmentSuffix title="Account" />
				<div className="grow flex flex-col px-5 overflow-y-auto">
					<AccountWelcomeView />
				</div>
			</div>
		)
	}

	return (
		<div className="fixed inset-0 flex flex-col overflow-hidden">
			<ViewHeader environment={environment} onDone={onDone} showEnvironmentSuffix title="Account" />
			<div className="grow flex flex-col px-5 overflow-y-auto">
				<AsiAccountSummary
					activeOrganization={activeOrganization}
					onOpenApiSettings={openApiSettings}
					AsiUser={AsiUser}
					remoteConfigSettings={remoteConfigSettings}
					userOrganizations={userOrganizations}
				/>
			</div>
		</div>
	)
}

type AsiAccountSummaryProps = {
	AsiUser: NonNullable<ReturnType<typeof useAsiAuth>["AsiUser"]>
	userOrganizations: UserOrganization[] | null
	activeOrganization: UserOrganization | null
	remoteConfigSettings: Partial<RemoteConfigFields> | undefined
	onOpenApiSettings: () => void
}

const AsiAccountSummary = ({
	AsiUser,
	userOrganizations,
	activeOrganization,
	remoteConfigSettings,
	onOpenApiSettings,
}: AsiAccountSummaryProps) => {
	const { displayName, email, uid } = AsiUser
	const isLockedByRemoteConfig = Object.keys(remoteConfigSettings || {}).length > 0

	const [dropdownValue, setDropdownValue] = useState<string>(activeOrganization?.organizationId || uid)

	useEffect(() => {
		const next = activeOrganization?.organizationId || uid
		setDropdownValue(next)
	}, [uid, activeOrganization?.organizationId])

	const handleOrganizationChange = useCallback((event: Event) => {
		const target = event.target as HTMLSelectElement
		const newValue = target?.value
		if (!newValue || newValue === dropdownValue) {
			return
		}
		setDropdownValue(newValue)
		const organizationId = newValue === uid ? undefined : newValue
		void AccountServiceClient.setUserOrganization({ organizationId }).catch(() => {})
	}, [dropdownValue, uid])

	return (
		<div className="h-full flex flex-col">
			<div className="flex flex-col w-full gap-1 mb-6">
				<div className="flex items-center flex-wrap gap-y-4">
					<div className="size-16 rounded-full bg-button-background flex items-center justify-center text-2xl text-button-foreground mr-4">
						{displayName?.[0] || email?.[0] || "?"}
					</div>

					<div className="flex flex-col">
						{displayName && <h2 className="text-foreground m-0 text-lg font-medium">{displayName}</h2>}
						{email && <div className="text-sm text-description">{email}</div>}

						<div className="flex gap-2 items-center mt-1">
							<Tooltip>
								<TooltipTrigger>
									<VSCodeDropdown
										className="w-full"
										currentValue={dropdownValue}
										disabled={isLockedByRemoteConfig}
										// @ts-expect-error webview-ui-toolkit types onChange as Event & FormEventHandler (unsatisfiable)
										onChange={handleOrganizationChange}>
										<VSCodeOption key="personal" value={uid}>
											Personal
										</VSCodeOption>
										{userOrganizations?.map((org: UserOrganization) => (
											<VSCodeOption key={org.organizationId} value={org.organizationId}>
												{org.name}
											</VSCodeOption>
										))}
									</VSCodeDropdown>
								</TooltipTrigger>
								<TooltipContent hidden={!isLockedByRemoteConfig}>
									This cannot be changed while your organization has remote configuration enabled.
								</TooltipContent>
							</Tooltip>
							{activeOrganization && (
								<VSCodeTag className="text-xs p-2" title="Role">
									{getMainRole(activeOrganization.roles)}
								</VSCodeTag>
							)}
						</div>
					</div>
				</div>
				<div className="w-full flex gap-2 flex-col min-[225px]:flex-row">
					<RemoteConfigToggle activeOrganization={activeOrganization} />
				</div>
			</div>

			<div className="w-full flex gap-2 flex-col min-[225px]:flex-row">
				<VSCodeButton appearance="primary" className="w-full min-[225px]:w-1/2" onClick={onOpenApiSettings}>
					Open API settings
				</VSCodeButton>
				<VSCodeButton appearance="secondary" className="w-full min-[225px]:w-1/2" onClick={() => handleSignOut()}>
					Log out
				</VSCodeButton>
			</div>
		</div>
	)
}

export default memo(AccountView)
