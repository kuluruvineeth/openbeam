import { execSync } from "node:child_process";
import type {
  AdapterEnvironmentCheck,
  AdapterEnvironmentTestResult,
} from "@openbeam/types/control/adapters";
import type { AdapterEnvironmentTestContext } from "../types";

export function testCodexEnvironment(
  _ctx: AdapterEnvironmentTestContext
): Promise<AdapterEnvironmentTestResult> {
  const checks: AdapterEnvironmentCheck[] = [];

  const cliFound = isCommandAvailable("codex");
  checks.push({
    code: "cli_installed",
    level: cliFound ? "info" : "error",
    message: cliFound
      ? "Codex CLI found in PATH"
      : "Codex CLI not found — install with: npm install -g @openai/codex",
    hint: cliFound ? null : "https://github.com/openai/codex",
  });

  const hasApiKey = Boolean(process.env.OPENAI_API_KEY);
  checks.push({
    code: "api_key",
    level: hasApiKey ? "info" : "warn",
    message: hasApiKey
      ? "OPENAI_API_KEY is set"
      : "OPENAI_API_KEY not set — can be provided per-agent in adapter config",
  });

  const hasError = checks.some((c) => c.level === "error");
  const hasWarn = checks.some((c) => c.level === "warn");

  return Promise.resolve({
    adapterType: "CODEX_LOCAL",
    status: deriveStatus(hasError, hasWarn),
    checks,
    testedAt: new Date().toISOString(),
  });
}

function deriveStatus(
  hasError: boolean,
  hasWarn: boolean
): "pass" | "warn" | "fail" {
  if (hasError) {
    return "fail";
  }
  if (hasWarn) {
    return "warn";
  }
  return "pass";
}

function isCommandAvailable(command: string): boolean {
  try {
    execSync(`which ${command}`, { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}
