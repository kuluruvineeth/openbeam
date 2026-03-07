import { execSync } from "node:child_process";
import type {
  AdapterEnvironmentCheck,
  AdapterEnvironmentTestResult,
} from "@openbeam/types/control/adapters";
import type { AdapterEnvironmentTestContext } from "../types";

export function testClaudeEnvironment(
  _ctx: AdapterEnvironmentTestContext
): Promise<AdapterEnvironmentTestResult> {
  const checks: AdapterEnvironmentCheck[] = [];

  const cliFound = isCommandAvailable("claude");
  checks.push({
    code: "cli_installed",
    level: cliFound ? "info" : "error",
    message: cliFound
      ? "Claude CLI found in PATH"
      : "Claude CLI not found — install with: npm install -g @anthropic-ai/claude-code",
    hint: cliFound ? null : "https://docs.anthropic.com/en/docs/claude-code",
  });

  const hasApiKey = Boolean(process.env.ANTHROPIC_API_KEY);
  checks.push({
    code: "api_key",
    level: hasApiKey ? "info" : "warn",
    message: hasApiKey
      ? "ANTHROPIC_API_KEY is set"
      : "ANTHROPIC_API_KEY not set — can be provided per-agent in adapter config",
  });

  const hasError = checks.some((c) => c.level === "error");
  const hasWarn = checks.some((c) => c.level === "warn");

  return Promise.resolve({
    adapterType: "CLAUDE_LOCAL",
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
