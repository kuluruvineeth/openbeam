import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

export default defineConfig(({ command }) => {
  if (command === "serve") {
    return {
      plugins: [react()],
      root: resolve(__dirname, "src/dev"),
    };
  }

  const INPUT = process.env.INPUT;
  if (!INPUT) {
    throw new Error("INPUT env var required (e.g., INPUT=search)");
  }

  return {
    plugins: [react(), viteSingleFile()],
    build: {
      outDir: resolve(__dirname, "dist/views"),
      emptyOutDir: false,
      rollupOptions: {
        input: resolve(__dirname, `src/views/${INPUT}/mcp-app.html`),
        onwarn(warning, handler) {
          if (warning.code === "MODULE_LEVEL_DIRECTIVE") {
            return;
          }
          handler(warning);
        },
      },
    },
  };
});
