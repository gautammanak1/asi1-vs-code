import type { Controller } from "@/core/controller"
import type { AsiAuthInfo } from "./AuthService"

/**
 * Pluggable account login (user identity), separate from LLM API keys.
 * - {@link import("./providers/ClineAuthProvider").AsiAuthProvider} — legacy Asi / WorkOS backend
 * - {@link import("./providers/Auth0AuthProvider").Auth0AuthProvider} — Auth0 (OIDC) for user profile only
 */
export interface AccountAuthProvider {
	readonly name: string

	getAuthRequest(callbackUrl: string, controller: Controller): Promise<string>

	signIn(
		controller: Controller,
		authorizationCode: string,
		provider: string,
		oauthState?: string,
	): Promise<AsiAuthInfo | null>

	retrieveAsiAuthInfo(controller: Controller): Promise<AsiAuthInfo | null>

	shouldRefreshIdToken(idToken: string, expiresAt?: number): Promise<boolean>

	/** Seconds until JWT `exp`, or 0 if unknown / expired */
	timeUntilExpiry(token: string): number
}
