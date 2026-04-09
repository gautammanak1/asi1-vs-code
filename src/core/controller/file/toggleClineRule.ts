import { getWorkspaceBasename } from "@core/workspace";
import type { ToggleClineRuleRequest } from "@shared/proto/Asi/file";
import { RuleScope, ToggleClineRules } from "@shared/proto/Asi/file";
import { telemetryService } from "@/services/telemetry";
import { Logger } from "@/shared/services/Logger";
import type { Controller } from "../index";

/**
 * Toggles a Asi rule (enable or disable)
 * @param controller The controller instance
 * @param request The toggle request
 * @returns The updated Asi rule toggles
 */
export async function toggleAsiRule(
	controller: Controller,
	request: ToggleClineRuleRequest,
): Promise<ToggleClineRules> {
	const { scope, rulePath, enabled } = request;

	if (!rulePath || typeof enabled !== "boolean" || scope === undefined) {
		Logger.error("toggleAsiRule: Missing or invalid parameters", {
			rulePath,
			scope,
			enabled:
				typeof enabled === "boolean" ? enabled : `Invalid: ${typeof enabled}`,
		});
		throw new Error("Missing or invalid parameters for toggleAsiRule");
	}

	// Handle the three different scopes
	switch (scope) {
		case RuleScope.GLOBAL: {
			const toggles = controller.stateManager.getGlobalSettingsKey(
				"globalAsiRulesToggles",
			);
			toggles[rulePath] = enabled;
			controller.stateManager.setGlobalState("globalAsiRulesToggles", toggles);
			break;
		}
		case RuleScope.LOCAL: {
			const toggles = controller.stateManager.getWorkspaceStateKey(
				"localAsiRulesToggles",
			);
			toggles[rulePath] = enabled;
			controller.stateManager.setWorkspaceState(
				"localAsiRulesToggles",
				toggles,
			);
			break;
		}
		case RuleScope.REMOTE: {
			const toggles =
				controller.stateManager.getGlobalStateKey("remoteRulesToggles");
			toggles[rulePath] = enabled;
			controller.stateManager.setGlobalState("remoteRulesToggles", toggles);
			break;
		}
		default:
			throw new Error(`Invalid scope: ${scope}`);
	}

	// Track rule toggle telemetry with current task context
	if (controller.task?.ulid) {
		// Extract just the filename for privacy (no full paths)
		const ruleFileName = getWorkspaceBasename(
			rulePath,
			"Controller.toggleAsiRule",
		);
		const isGlobal = scope === RuleScope.GLOBAL;
		telemetryService.captureAsiRuleToggled(
			controller.task.ulid,
			ruleFileName,
			enabled,
			isGlobal,
		);
	}

	// Get the current state to return in the response
	const globalToggles = controller.stateManager.getGlobalSettingsKey(
		"globalAsiRulesToggles",
	);
	const localToggles = controller.stateManager.getWorkspaceStateKey(
		"localAsiRulesToggles",
	);
	const remoteToggles =
		controller.stateManager.getGlobalStateKey("remoteRulesToggles");

	return ToggleClineRules.create({
		globalClineRulesToggles: { toggles: globalToggles },
		localClineRulesToggles: { toggles: localToggles },
		remoteRulesToggles: { toggles: remoteToggles },
	});
}

export { toggleAsiRule as toggleClineRule };
