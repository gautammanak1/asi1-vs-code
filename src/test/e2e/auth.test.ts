import { expect } from "@playwright/test";
import { e2e } from "./utils/helpers";

// Welcome flow: ASI:One API key only (no provider picker).
e2e("Views — welcome, API key, and chat", async ({ sidebar, helper }) => {
	await helper.signin(sidebar);

	const chatInput = sidebar.getByTestId("chat-input");
	await expect(chatInput).toBeVisible();

	// Announcements region (if present)
	const announcementsRegion = sidebar.locator('[aria-label="Announcements"]');
	try {
		await expect(announcementsRegion).toBeVisible({ timeout: 5_000 });
		const pageIndicator = announcementsRegion
			.locator("div")
			.filter({ hasText: /^\d+ \/ \d+$/ })
			.first();
		await expect(pageIndicator).toBeVisible();
		const initialIndicator = (await pageIndicator.innerText()).trim();
		const totalBanners = Number(initialIndicator.split("/")[1]?.trim() || "0");
		if (totalBanners > 1) {
			await sidebar.getByRole("button", { name: "Next banner" }).click();
			await expect(pageIndicator).not.toHaveText(initialIndicator);
			await sidebar.getByRole("button", { name: "Previous banner" }).click();
			await expect(pageIndicator).toHaveText(initialIndicator);
		}
	} catch {
		// Optional in minimal installs
	}
});
