import { execSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

const viewsDir = join(import.meta.dir, "../src/views");

const views = readdirSync(viewsDir, { withFileTypes: true })
  .filter((e) => e.isDirectory())
  .filter((e) => existsSync(join(viewsDir, e.name, "mcp-app.html")))
  .map((e) => e.name);

if (views.length === 0) {
  console.error("No views found in src/views/");
  process.exit(1);
}

for (const view of views) {
  console.log(`Building ${view}...`);
  execSync(`INPUT=${view} bunx vite build`, {
    stdio: "inherit",
    cwd: join(import.meta.dir, ".."),
  });
}

console.log(`\nBuilt ${views.length} apps: ${views.join(", ")}`);
