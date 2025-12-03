import { defineConfig } from "tsdown";

export default defineConfig({
  entry: [
    "src/index.ts",
    "src/providers/index.ts",
    "src/embeddings/index.ts",
    "src/completion/index.ts",
    "src/agents/index.ts",
    "src/tools/index.ts",
  ],
  format: ["esm"],
  dts: true,
  clean: true,
  external: [/^@openplane\//],
});
