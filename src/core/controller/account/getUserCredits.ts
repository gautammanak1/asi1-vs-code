import { UserCreditsData } from "@shared/proto/asi/account"
import type { EmptyRequest } from "@shared/proto/asi/common"
import type { Controller } from "../index"

/**
 * Fetch Coder POC: no Asi billing API — returns empty credits data without network calls.
 */
export async function getUserCredits(_controller: Controller, _request: EmptyRequest): Promise<UserCreditsData> {
	return UserCreditsData.create({
		balance: { currentBalance: 0 },
		usageTransactions: [],
		paymentTransactions: [],
	})
}
