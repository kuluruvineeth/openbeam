import { execSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  renameSync,
  rmSync,
} from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dir, "..");
const viewsDir = join(root, "src/views");
const distDir = join(root, "dist/views");

const views = readdirSync(viewsDir, { withFileTypes: true })
  .filter((e) => e.isDirectory())
  .filter((e) => existsSync(join(viewsDir, e.name, "mcp-app.html")))
  .map((e) => e.name);

if (views.length === 0) {
  console.error("No views found in src/views/");
  process.exit(1);
}

rmSync(distDir, { recursive: true, force: true });
mkdirSync(distDir, { recursive: true });

for (const view of views) {
  console.log(`Building ${view}...`);
  execSync(`INPUT=${view} bunx vite build`, {
    stdio: "inherit",
    cwd: root,
  });

  const builtDir = join(distDir, view);
  const nested = join(builtDir, "src/views", view, "mcp-app.html");
  const direct = join(builtDir, "mcp-app.html");

  let source: string | null = null;
  if (existsSync(nested)) {
    source = nested;
  } else if (existsSync(direct)) {
    source = direct;
  }

  if (source) {
    renameSync(source, join(distDir, `${view}.html`));
  }

  rmSync(builtDir, { recursive: true, force: true });
}

console.log(`\nBuilt ${views.length} apps: ${views.join(", ")}`);
