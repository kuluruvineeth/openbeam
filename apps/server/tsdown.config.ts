import { defineConfig } from "tsdown";

export default defineConfig({
  entry: "./src/index.ts",
  format: "esm",
  outDir: "./dist",
  clean: true,
  noExternal: [
    /@openbeam\/(services|auth|integrations|vespa|media|ai|mcp-server)/,
    /@modelcontextprotocol/,
  ],
  external: [
    "@openbeam/db",
    "@openbeam/redis",
    "@openbeam/api",
    "@openbeam/storage",
    "@duckdb/node-bindings",
  ],
});
