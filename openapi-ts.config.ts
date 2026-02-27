import { defineConfig } from "@hey-api/openapi-ts";

export default defineConfig({
  client: "@hey-api/client-fetch",
  input: "packages/types/src/services/engine/openapi.json",
  output: {
    path: "packages/services/src/engine/generated",
  },
  postProcess: ["biome:format"],
  types: {
    enums: "typescript",
    dates: "types",
  },
});
