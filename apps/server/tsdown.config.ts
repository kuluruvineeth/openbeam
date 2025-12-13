import { defineConfig } from "tsdown";

export default defineConfig({
  entry: "./src/index.ts",
  format: "esm",
  outDir: "./dist",
  clean: true,
  noExternal: [/@openplane\/(services|auth|integrations|vespa|media|ai)/],
  external: [
    "@openplane/db",
    "@openplane/redis",
    "@openplane/api",
    "@openplane/storage",
  ],
});
