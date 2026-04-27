import { ApiProviderInfo } from "@core/api"
import {
	isAsi1Model,
	isLocalModel,
	isNativeToolCallingConfig,
	parsePrice,
} from "../model-utils"

describe("isAsi1Model", () => {
	it("matches default and hosted ASI:One ids", () => {
		isAsi1Model("asi1-mini").should.equal(true)
		isAsi1Model("ASI1-large").should.equal(true)
		isAsi1Model("openai/asi1-mini").should.equal(true)
	})

	it("does not match unrelated ids", () => {
		isAsi1Model("gpt-4").should.equal(false)
		isAsi1Model("claude-3-sonnet").should.equal(false)
	})
})

describe("parsePrice", () => {
	it("converts per-token to per-million-tokens", () => {
		parsePrice("0.000002").should.equal(2)
		parsePrice("0").should.equal(0)
		parsePrice(undefined).should.equal(0)
	})
})

describe("isLocalModel", () => {
	it("detects local providers", () => {
		isLocalModel({ providerId: "ollama", model: { id: "x", info: {} as any } } as ApiProviderInfo).should.equal(true)
		isLocalModel({ providerId: "asi:one", model: { id: "asi1-mini", info: {} as any } } as ApiProviderInfo).should.equal(
			false,
		)
	})
})

describe("isNativeToolCallingConfig", () => {
	const base: ApiProviderInfo = {
		providerId: "openai",
		model: { id: "asi1-mini", info: {} as any },
		mode: "act",
	}

	it("requires flag, provider, and ASI:One model id", () => {
		isNativeToolCallingConfig(base, false).should.equal(false)
		isNativeToolCallingConfig({ ...base, providerId: "unknown" }, true).should.equal(false)
		isNativeToolCallingConfig({ ...base, model: { id: "gpt-4", info: {} as any } }, true).should.equal(false)
		isNativeToolCallingConfig(base, true).should.equal(true)
	})
})
