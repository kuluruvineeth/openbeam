import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@server": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    testTimeout: 30_000,
    hookTimeout: 60_000,
    globals: true,
    environment: "node",
    setupFiles: [path.resolve(__dirname, "./src/test-utils/vitest-setup.ts")],
    pool: "forks",
    poolOptions: {
      forks: {
        singleFork: false,
        maxForks: 4,
      },
    },
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "__tests__/**",
      "src/__tests__/**",
      "**/*.e2e.test.ts",
      "**/*.real.e2e.test.ts",
    ],
  },
});
