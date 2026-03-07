import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import type {
  AdapterEnvironmentCheck,
  AdapterEnvironmentTestResult,
} from "@openbeam/types/control/adapters";
import type { AdapterEnvironmentTestContext } from "../types";
import { asString } from "../utils";

export function testProcessEnvironment(
  ctx: AdapterEnvironmentTestContext
): Promise<AdapterEnvironmentTestResult> {
  const checks: AdapterEnvironmentCheck[] = [];
  const command = asString(ctx.config.command);

  if (!command) {
    checks.push({
      code: "command_missing",
      level: "error",
      message: "No command specified in adapter config",
    });
    return Promise.resolve({
      adapterType: "PROCESS",
      status: "fail",
      checks,
      testedAt: new Date().toISOString(),
    });
  }

  const resolvable = isCommandResolvable(command);
  checks.push({
    code: "command_resolvable",
    level: resolvable ? "info" : "error",
    message: resolvable
      ? `Command "${command}" found in PATH`
      : `Command "${command}" not found`,
  });

  const cwd = asString(ctx.config.cwd);
  if (cwd) {
    const cwdExists = existsSync(cwd);
    checks.push({
      code: "cwd_exists",
      level: cwdExists ? "info" : "error",
      message: cwdExists
        ? `Working directory "${cwd}" exists`
        : `Working directory "${cwd}" not found`,
    });
  }

  const hasError = checks.some((c) => c.level === "error");
  const hasWarn = checks.some((c) => c.level === "warn");

  return Promise.resolve({
    adapterType: "PROCESS",
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

function isCommandResolvable(command: string): boolean {
  try {
    execSync(`which ${command}`, { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}
