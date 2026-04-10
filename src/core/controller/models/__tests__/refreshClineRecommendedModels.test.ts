import * as disk from "@core/storage/disk";
import axios from "axios";
import { expect } from "chai";
import fs from "fs/promises";
import { afterEach, beforeEach, describe, it } from "mocha";
import sinon from "sinon";
import { AsiEnv, Environment } from "@/config";
import { getFeatureFlagsService } from "@/services/feature-flags";
import { Asi_RECOMMENDED_MODELS_FALLBACK } from "@/shared/asi/recommended-models";
import { FeatureFlag } from "@/shared/services/feature-flags/feature-flags";
import { Logger } from "@/shared/services/Logger";
import {
	refreshClineRecommendedModels,
	resetAsiRecommendedModelsCacheForTests,
} from "../refreshClineRecommendedModels";

describe("refreshClineRecommendedModels", () => {
	let sandbox: sinon.SinonSandbox;

	beforeEach(() => {
		sandbox = sinon.createSandbox();
		resetAsiRecommendedModelsCacheForTests();
		sandbox.stub(Logger, "log");
		sandbox.stub(Logger, "error");
	});

	afterEach(() => {
		resetAsiRecommendedModelsCacheForTests();
		sandbox.restore();
	});

	it("returns hardcoded models and skips upstream fetch when rollout flag is off", async () => {
		sandbox
			.stub(getFeatureFlagsService(), "getBooleanFlagEnabled")
			.returns(false);
		const axiosGetStub = sandbox.stub(axios, "get");

		const result = await refreshClineRecommendedModels();

		expect(result).to.deep.equal(Asi_RECOMMENDED_MODELS_FALLBACK);
		expect(axiosGetStub.called).to.equal(false);
	});

	it("fetches from upstream when rollout flag is on", async () => {
		sandbox
			.stub(getFeatureFlagsService(), "getBooleanFlagEnabled")
			.callsFake((flag) => {
				return flag === FeatureFlag.Asi_RECOMMENDED_MODELS_UPSTREAM;
			});
		sandbox.stub(AsiEnv, "config").returns({
			environment: Environment.production,
			appBaseUrl: "https://app.Asi-mock.bot",
			apiBaseUrl: "https://api.Asi-mock.bot",
			mcpBaseUrl: "https://api.Asi-mock.bot/v1/mcp",
		});
		sandbox.stub(disk, "ensureCacheDirectoryExists").resolves("/tmp");
		sandbox.stub(fs, "writeFile").resolves();
		const axiosGetStub = sandbox.stub(axios, "get").resolves({
			data: {
				recommended: [
					{
						id: "anthropic/claude-sonnet-4.6",
						description: "Remote recommended",
						tags: ["NEW"],
					},
				],
				free: [{ id: "z-ai/glm-5", description: "Remote free" }],
			},
		});

		const result = await refreshClineRecommendedModels();

		expect(axiosGetStub.calledOnce).to.equal(true);
		expect(result).to.deep.equal({
			recommended: [
				{
					id: "anthropic/claude-sonnet-4.6",
					name: "anthropic/claude-sonnet-4.6",
					description: "Remote recommended",
					tags: ["NEW"],
				},
			],
			free: [
				{
					id: "z-ai/glm-5",
					name: "z-ai/glm-5",
					description: "Remote free",
					tags: [],
				},
			],
		});
	});

	it("uses hardcoded models when rollout flag is turned off after upstream cache is populated", async () => {
		const flagStub = sandbox.stub(
			getFeatureFlagsService(),
			"getBooleanFlagEnabled",
		);
		flagStub.onFirstCall().returns(true);
		flagStub.onSecondCall().returns(false);
		sandbox.stub(AsiEnv, "config").returns({
			environment: Environment.production,
			appBaseUrl: "https://app.Asi-mock.bot",
			apiBaseUrl: "https://api.Asi-mock.bot",
			mcpBaseUrl: "https://api.Asi-mock.bot/v1/mcp",
		});
		sandbox.stub(disk, "ensureCacheDirectoryExists").resolves("/tmp");
		sandbox.stub(fs, "writeFile").resolves();
		const axiosGetStub = sandbox.stub(axios, "get").resolves({
			data: {
				recommended: [
					{
						id: "google/gemini-3.1-pro-preview",
						description: "Remote recommended",
						tags: ["NEW"],
					},
				],
				free: [
					{
						id: "minimax/minimax-m2.5",
						description: "Remote free",
						tags: ["FREE"],
					},
				],
			},
		});

		const firstResult = await refreshClineRecommendedModels();
		const secondResult = await refreshClineRecommendedModels();

		expect(axiosGetStub.calledOnce).to.equal(true);
		expect(firstResult).to.not.deep.equal(Asi_RECOMMENDED_MODELS_FALLBACK);
		expect(secondResult).to.deep.equal(Asi_RECOMMENDED_MODELS_FALLBACK);
	});
});
