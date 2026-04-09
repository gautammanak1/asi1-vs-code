import {
    ActivatedConditionalRule,
    getRemoteRulesTotalContentWithMetadata,
    getRuleFilesTotalContentWithMetadata,
    RULE_SOURCE_PREFIX,
    RuleLoadResultWithInstructions,
    synchronizeRuleToggles,
} from "@core/context/instructions/user-instructions/rule-helpers"
import { formatResponse } from "@core/prompts/responses"
import { ensureRulesDirectoryExists, GlobalFileNames } from "@core/storage/disk"
import { StateManager } from "@core/storage/StateManager"
import { AsiRulesToggles } from "@shared/asi-rules"
import { fileExistsAtPath, isDirectory, readDirectory } from "@utils/fs"
import fs from "fs/promises"
import path from "path"
import { Controller } from "@/core/controller"
import { Logger } from "@/shared/services/Logger"
import { parseYamlFrontmatter } from "./frontmatter"
import { evaluateRuleConditionals, type RuleEvaluationContext } from "./rule-conditionals"

export const getGlobalAsiRules = async (
	globalAsiRulesFilePath: string,
	toggles: AsiRulesToggles,
	opts?: { evaluationContext?: RuleEvaluationContext },
): Promise<RuleLoadResultWithInstructions> => {
	let combinedContent = ""
	const activatedConditionalRules: ActivatedConditionalRule[] = []

	// 1. Get file-based rules
	if (await fileExistsAtPath(globalAsiRulesFilePath)) {
		if (await isDirectory(globalAsiRulesFilePath)) {
			try {
				const rulesFilePaths = await readDirectory(globalAsiRulesFilePath)
				// Note: ruleNamePrefix explicitly set to "global" for clarity (matches the default)
				const rulesFilesTotal = await getRuleFilesTotalContentWithMetadata(
					rulesFilePaths,
					globalAsiRulesFilePath,
					toggles,
					{
						evaluationContext: opts?.evaluationContext,
						ruleNamePrefix: "global",
					},
				)
				if (rulesFilesTotal.content) {
					combinedContent = rulesFilesTotal.content
					activatedConditionalRules.push(...rulesFilesTotal.activatedConditionalRules)
				}
			} catch {
				Logger.error(`Failed to read .Asirules directory at ${globalAsiRulesFilePath}`)
			}
		} else {
			Logger.error(`${globalAsiRulesFilePath} is not a directory`)
		}
	}

	// 2. Append remote config rules
	const stateManager = StateManager.get()
	const remoteConfigSettings = stateManager.getRemoteConfigSettings()
	const remoteRules = remoteConfigSettings.remoteGlobalRules || []
	const remoteToggles = stateManager.getGlobalStateKey("remoteRulesToggles") || {}
	const remoteResult = getRemoteRulesTotalContentWithMetadata(remoteRules, remoteToggles, {
		evaluationContext: opts?.evaluationContext,
	})
	if (remoteResult.content) {
		if (combinedContent) combinedContent += "\n\n"
		combinedContent += remoteResult.content
		activatedConditionalRules.push(...remoteResult.activatedConditionalRules)
	}

	// 3. Return formatted instructions
	if (!combinedContent) {
		return { instructions: undefined, activatedConditionalRules: [] }
	}

	return {
		instructions: formatResponse.AsiRulesGlobalDirectoryInstructions(globalAsiRulesFilePath, combinedContent),
		activatedConditionalRules,
	}
}

export const getLocalAsiRules = async (
	cwd: string,
	toggles: AsiRulesToggles,
	opts?: { evaluationContext?: RuleEvaluationContext },
): Promise<RuleLoadResultWithInstructions> => {
	const AsiRulesFilePath = path.resolve(cwd, GlobalFileNames.AsiRules)

	let instructions: string | undefined
	const activatedConditionalRules: ActivatedConditionalRule[] = []

	if (await fileExistsAtPath(AsiRulesFilePath)) {
		if (await isDirectory(AsiRulesFilePath)) {
			try {
				const rulesFilePaths = await readDirectory(AsiRulesFilePath, [
					[".Asirules", "workflows"],
					[".Asirules", "hooks"],
					[".Asirules", "skills"],
				])

				const rulesFilesTotal = await getRuleFilesTotalContentWithMetadata(rulesFilePaths, cwd, toggles, {
					evaluationContext: opts?.evaluationContext,
					ruleNamePrefix: "workspace",
				})
				if (rulesFilesTotal.content) {
					instructions = formatResponse.AsiRulesLocalDirectoryInstructions(cwd, rulesFilesTotal.content)
					activatedConditionalRules.push(...rulesFilesTotal.activatedConditionalRules)
				}
			} catch {
				Logger.error(`Failed to read .Asirules directory at ${AsiRulesFilePath}`)
			}
		} else {
			try {
				if (AsiRulesFilePath in toggles && toggles[AsiRulesFilePath] !== false) {
					const raw = (await fs.readFile(AsiRulesFilePath, "utf8")).trim()
					if (raw) {
						// Keep single-file .Asirules behavior consistent with directory/remote rules:
						// - Parse YAML frontmatter (fail-open on parse errors)
						// - Evaluate conditionals against the request's evaluation context
						const parsed = parseYamlFrontmatter(raw)
						if (parsed.hadFrontmatter && parsed.parseError) {
							// Fail-open: preserve the raw contents so the LLM can still see the author's intent.
							instructions = formatResponse.AsiRulesLocalFileInstructions(cwd, raw)
						} else {
							const { passed, matchedConditions } = evaluateRuleConditionals(
								parsed.data,
								opts?.evaluationContext ?? {},
							)
							if (passed) {
								instructions = formatResponse.AsiRulesLocalFileInstructions(cwd, parsed.body.trim())
								if (parsed.hadFrontmatter && Object.keys(matchedConditions).length > 0) {
									activatedConditionalRules.push({
										name: `${RULE_SOURCE_PREFIX.workspace}:${GlobalFileNames.AsiRules}`,
										matchedConditions,
									})
								}
							}
						}
					}
				}
			} catch {
				Logger.error(`Failed to read .Asirules file at ${AsiRulesFilePath}`)
			}
		}
	}

	return { instructions, activatedConditionalRules }
}

export async function refreshAsiRulesToggles(
	controller: Controller,
	workingDirectory: string,
): Promise<{
	globalToggles: AsiRulesToggles
	localToggles: AsiRulesToggles
}> {
	// Global toggles
	const globalAsiRulesToggles = controller.stateManager.getGlobalSettingsKey("globalAsiRulesToggles")
	const globalAsiRulesFilePath = await ensureRulesDirectoryExists()
	const updatedGlobalToggles = await synchronizeRuleToggles(globalAsiRulesFilePath, globalAsiRulesToggles)
	controller.stateManager.setGlobalState("globalAsiRulesToggles", updatedGlobalToggles)

	// Local toggles
	const localAsiRulesToggles = controller.stateManager.getWorkspaceStateKey("localAsiRulesToggles")
	const localAsiRulesFilePath = path.resolve(workingDirectory, GlobalFileNames.AsiRules)
	const updatedLocalToggles = await synchronizeRuleToggles(localAsiRulesFilePath, localAsiRulesToggles, "", [
		[".Asirules", "workflows"],
		[".Asirules", "hooks"],
		[".Asirules", "skills"],
	])
	controller.stateManager.setWorkspaceState("localAsiRulesToggles", updatedLocalToggles)

	return {
		globalToggles: updatedGlobalToggles,
		localToggles: updatedLocalToggles,
	}
}
