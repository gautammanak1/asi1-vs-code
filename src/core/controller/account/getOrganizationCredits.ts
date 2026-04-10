import {
	GetOrganizationCreditsRequest,
	OrganizationCreditsData,
} from "@shared/proto/Asi/account";
import type { Controller } from "../index";

/**
 * Fetch Coder POC: no Asi org billing API — returns empty data without network calls.
 */
export async function getOrganizationCredits(
	_controller: Controller,
	request: GetOrganizationCreditsRequest,
): Promise<OrganizationCreditsData> {
	return OrganizationCreditsData.create({
		balance: { currentBalance: 0 },
		organizationId: request.organizationId,
		usageTransactions: [],
	});
}
