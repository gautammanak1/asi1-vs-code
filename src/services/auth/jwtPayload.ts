import { type JwtPayload, jwtDecode } from "jwt-decode";

/**
 * Decodes a JWT payload without validation.
 * Use only for non-security, informational, or display purposes.
 */
export function parseJwtPayload<T extends JwtPayload>(token: string): T | null {
	try {
		return jwtDecode<T>(token);
	} catch {
		return null;
	}
}
