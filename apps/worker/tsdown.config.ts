import { defineConfig } from "tsdown";

export default defineConfig({
  entries: ["./src/index.ts"],
  splitting: false,
  format: "esm",
  target: "node18",
});
