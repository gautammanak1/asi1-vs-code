import { createHash, randomBytes } from "node:crypto"
import type { JwtPayload } from "jwt-decode"
import * as vscode from "vscode"
import type { Controller } from "@/core/controller"
import { HostProvider } from "@/hosts/host-provider"
import { fetch } from "@/shared/net"
import { Logger } from "@/shared/services/Logger"
import type { AsiAccountUserInfo, AsiAuthInfo } from "../AuthService"
import type { AccountAuthProvider } from "../account-auth-provider"
import { parseJwtPayload } from "../jwtPayload"

function base64url(buf: Buffer): string {
	return buf
		.toString("base64")
		.replace(/\+/g, "-")
		.replace(/\//g, "_")
		.replace(/=+$/, "")
}

function normalizeAuth0Domain(domain: string): string {
	return domain.trim().replace(/^https?:\/\//, "").replace(/\/$/, "")
}

interface Auth0TokenResponse {
	access_token: string
	id_token?: string
	refresh_token?: string
	expires_in?: number
	token_type?: string
}

/**
 * Auth0 Authorization Code + PKCE. Identity / user profile only — LLM calls still use API keys (ASI:One).
 *
 * Auth0 Dashboard: Application → Native, add callback URL exactly matching the extension redirect
 * (e.g. `vscode://gautammanak2.fetch-coder/auth` or Cursor’s scheme).
 */
export class Auth0AuthProvider implements AccountAuthProvider {
	readonly name = "auth0"

	async getAuthRequest(callbackUrl: string, controller: Controller): Promise<string> {
		const { domain, clientId, audience } = readAuth0Settings()
		if (!domain || !clientId) {
			throw new Error(
				"Auth0 enabled but fetchCoder.auth0.domain or fetchCoder.auth0.clientId is empty. Set them in Settings.",
			)
		}

		const { verifier, challenge } = generatePkcePair()
		const state = base64url(randomBytes(16))
		controller.stateManager.setSecret(
			"auth0PkceState",
			JSON.stringify({ verifier, state }),
		)

		const base = `https://${normalizeAuth0Domain(domain)}`
		const u = new URL(`${base}/authorize`)
		u.searchParams.set("response_type", "code")
		u.searchParams.set("client_id", clientId)
		u.searchParams.set("redirect_uri", callbackUrl)
		u.searchParams.set("scope", "openid profile email offline_access")
		u.searchParams.set("state", state)
		u.searchParams.set("code_challenge", challenge)
		u.searchParams.set("code_challenge_method", "S256")
		if (audience?.trim()) {
			u.searchParams.set("audience", audience.trim())
		}

		return u.toString()
	}

	async signIn(
		controller: Controller,
		authorizationCode: string,
		_provider: string,
		oauthState?: string,
	): Promise<AsiAuthInfo | null> {
		const { domain, clientId, audience } = readAuth0Settings()
		if (!domain || !clientId) {
			throw new Error("Auth0 domain/clientId not configured")
		}

		const raw = controller.stateManager.getSecretKey("auth0PkceState")
		if (!raw) {
			throw new Error("Missing Auth0 PKCE state — start login again from the extension.")
		}
		let verifier: string
		let expectedState: string
		try {
			const parsed = JSON.parse(raw) as { verifier: string; state: string }
			verifier = parsed.verifier
			expectedState = parsed.state
		} catch {
			throw new Error("Invalid Auth0 PKCE storage")
		}

		if (oauthState && oauthState !== expectedState) {
			throw new Error("Auth0 OAuth state mismatch — try signing in again.")
		}

		const callbackUrl = await HostProvider.get().getCallbackUrl("/auth")

		const base = `https://${normalizeAuth0Domain(domain)}`
		const tokenUrl = `${base}/oauth/token`
		const body = new URLSearchParams({
			grant_type: "authorization_code",
			client_id: clientId,
			code: authorizationCode,
			redirect_uri: callbackUrl,
			code_verifier: verifier,
		})
		if (audience?.trim()) {
			body.set("audience", audience.trim())
		}

		const res = await fetch(tokenUrl, {
			method: "POST",
			headers: { "Content-Type": "application/x-www-form-urlencoded" },
			body: body.toString(),
		})

		if (!res.ok) {
			const errText = await res.text()
			Logger.error("Auth0 token exchange failed:", res.status, errText)
			throw new Error(`Auth0 token exchange failed (${res.status})`)
		}

		const data = (await res.json()) as Auth0TokenResponse
		if (!data.access_token) {
			throw new Error("Auth0 response missing access_token")
		}

		const idToken = data.id_token || data.access_token
		const claims = parseJwtPayload<JwtPayload & { sub?: string; email?: string; name?: string }>(idToken) || {}
		const sub = typeof claims.sub === "string" ? claims.sub : ""
		const email = typeof claims.email === "string" ? claims.email : ""
		const displayName =
			typeof claims.name === "string" ? claims.name : email || sub || "Auth0 user"

		const expiresAtSec =
			typeof claims.exp === "number"
				? claims.exp
				: Math.floor(Date.now() / 1000) + (data.expires_in ?? 3600)

		const userInfo: AsiAccountUserInfo = {
			id: sub,
			email,
			displayName,
			createdAt: new Date().toISOString(),
			organizations: [],
			subject: sub,
		}

		const auth: AsiAuthInfo = {
			idToken,
			refreshToken: data.refresh_token,
			expiresAt: expiresAtSec,
			userInfo,
			provider: this.name,
			startedAt: Date.now(),
			oauthAccessToken: data.access_token,
		}

		controller.stateManager.setSecret("Asi:AsiAccountId", JSON.stringify(auth))
		controller.stateManager.setSecret("auth0PkceState", undefined)
		return auth
	}

	async retrieveAsiAuthInfo(controller: Controller): Promise<AsiAuthInfo | null> {
		const stored = controller.stateManager.getSecretKey("Asi:AsiAccountId")
		if (!stored) {
			return null
		}
		let auth: AsiAuthInfo
		try {
			auth = JSON.parse(stored) as AsiAuthInfo
		} catch {
			return null
		}
		if (auth.provider !== this.name) {
			return null
		}

		if (!auth.refreshToken) {
			return auth.idToken ? auth : null
		}

		if (await this.shouldRefreshIdToken(auth.idToken, auth.expiresAt)) {
			const refreshed = await this.refreshSession(controller, auth.refreshToken)
			if (refreshed) {
				return refreshed
			}
		}
		return auth
	}

	private async refreshSession(controller: Controller, refreshToken: string): Promise<AsiAuthInfo | null> {
		const { domain, clientId, audience } = readAuth0Settings()
		if (!domain || !clientId) {
			return null
		}
		const base = `https://${normalizeAuth0Domain(domain)}`
		const body = new URLSearchParams({
			grant_type: "refresh_token",
			client_id: clientId,
			refresh_token: refreshToken,
		})
		if (audience?.trim()) {
			body.set("audience", audience.trim())
		}
		const res = await fetch(`${base}/oauth/token`, {
			method: "POST",
			headers: { "Content-Type": "application/x-www-form-urlencoded" },
			body: body.toString(),
		})
		if (!res.ok) {
			Logger.warn("Auth0 refresh failed:", await res.text())
			return null
		}
		const data = (await res.json()) as Auth0TokenResponse
		if (!data.access_token) {
			return null
		}
		const idToken = data.id_token || data.access_token
		const claims = parseJwtPayload<JwtPayload & { sub?: string; email?: string; name?: string }>(idToken) || {}
		const sub = typeof claims.sub === "string" ? claims.sub : ""
		const email = typeof claims.email === "string" ? claims.email : ""
		const displayName =
			typeof claims.name === "string" ? claims.name : email || sub || "Auth0 user"
		const expiresAtSec =
			typeof claims.exp === "number"
				? claims.exp
				: Math.floor(Date.now() / 1000) + (data.expires_in ?? 3600)

		const userInfo: AsiAccountUserInfo = {
			id: sub,
			email,
			displayName,
			createdAt: new Date().toISOString(),
			organizations: [],
			subject: sub,
		}

		const auth: AsiAuthInfo = {
			idToken,
			refreshToken: data.refresh_token || refreshToken,
			expiresAt: expiresAtSec,
			userInfo,
			provider: this.name,
			startedAt: Date.now(),
			oauthAccessToken: data.access_token,
		}
		controller.stateManager.setSecret("Asi:AsiAccountId", JSON.stringify(auth))
		return auth
	}

	async shouldRefreshIdToken(_idToken: string, expiresAt?: number): Promise<boolean> {
		const expirationTime = expiresAt || 0
		const currentTime = Date.now() / 1000
		const next5Min = currentTime + 5 * 60
		return expirationTime < next5Min
	}

	timeUntilExpiry(token: string): number {
		const data = parseJwtPayload<JwtPayload>(token)
		if (!data?.exp) {
			return 0
		}
		return data.exp - Date.now() / 1000
	}
}

function generatePkcePair(): { verifier: string; challenge: string } {
	const verifier = base64url(randomBytes(32))
	const challenge = base64url(createHash("sha256").update(verifier, "utf8").digest())
	return { verifier, challenge }
}

function readAuth0Settings(): { domain: string; clientId: string; audience: string } {
	const c = vscode.workspace.getConfiguration("fetchCoder")
	return {
		domain: (c.get<string>("auth0.domain") ?? "").trim(),
		clientId: (c.get<string>("auth0.clientId") ?? "").trim(),
		audience: (c.get<string>("auth0.audience") ?? "").trim(),
	}
}

export function isAuth0LoginEnabled(): boolean {
	try {
		const c = vscode.workspace.getConfiguration("fetchCoder")
		return c.get<boolean>("auth0.enabled") === true
	} catch {
		return false
	}
}
