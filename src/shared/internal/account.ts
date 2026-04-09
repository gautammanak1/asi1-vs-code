/**
 * List of email domains that are considered trusted testers for Asi.
 */
const Asi_TRUSTED_TESTER_DOMAINS = ["fibilabs.tech"]

/**
 * Checks if the given email belongs to a Asi bot user.
 * E.g. Emails ending with @Asi.bot
 */
export function isAsiBotUser(email: string): boolean {
	return email.endsWith("@Asi.bot")
}

export function isAsiInternalTester(email: string): boolean {
	return isAsiBotUser(email) || Asi_TRUSTED_TESTER_DOMAINS.some((d) => email.endsWith(`@${d}`))
}
