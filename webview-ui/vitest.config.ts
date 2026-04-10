import { defineConfig, mergeConfig } from "vitest/config"
import viteConfig from "./vite.config"

export default mergeConfig(
	viteConfig,
	defineConfig({
		test: {
			environment: "jsdom",
			globals: true,
			setupFiles: ["./src/setupTests.ts"],
			coverage: {
				provider: "v8",
				reportOnFailure: true,
				reporter: ["html", "lcov", "text"],
				reportsDirectory: "./coverage",
				exclude: [
					"**/*.{spec,test}.{js,jsx,ts,tsx,mjs,cjs}",

					"**/*.d.ts",
					"**/vite-env.d.ts",
					"**/*.{config,setup}.{js,ts,mjs,cjs}",

					"**/*.{css,scss,sass,less,styl}",
					"**/*.{svg,png,jpg,jpeg,gif,ico}",

					"**/*.{json,yaml,yml}",

					"**/__mocks__/**",
					"node_modules/**",
					"build/**",
					"coverage/**",
					"dist/**",
					"public/**",

					"src/services/grpc-client.ts",
				],
			},
		},
	}),
)
