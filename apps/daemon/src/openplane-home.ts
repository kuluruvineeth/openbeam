import { mkdirSync } from "node:fs";
import os from "node:os";
import path from "node:path";

function expandHomeDir(input: string): string {
  if (input.startsWith("~/")) {
    return path.join(os.homedir(), input.slice(2));
  }
  if (input === "~") {
    return os.homedir();
  }
  return input;
}

export function resolveOpenPlaneHome(
  env: NodeJS.ProcessEnv = process.env
): string {
  const raw = env.OPENPLANE_HOME ?? "~/.openplane";
  const resolved = path.resolve(expandHomeDir(raw));
  mkdirSync(resolved, { recursive: true });
  return resolved;
}
