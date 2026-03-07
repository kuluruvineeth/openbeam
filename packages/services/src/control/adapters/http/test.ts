import type {
  AdapterEnvironmentCheck,
  AdapterEnvironmentTestResult,
} from "@openbeam/types/control/adapters";
import type { AdapterEnvironmentTestContext } from "../types";
import { asString } from "../utils";

const REACHABILITY_TIMEOUT_MS = 10_000;

export async function testHttpEnvironment(
  ctx: AdapterEnvironmentTestContext
): Promise<AdapterEnvironmentTestResult> {
  const checks: AdapterEnvironmentCheck[] = [];
  const url = asString(ctx.config.url);

  if (!url) {
    checks.push({
      code: "url_missing",
      level: "error",
      message: "No URL specified in adapter config",
    });
    return {
      adapterType: "HTTP",
      status: "fail",
      checks,
      testedAt: new Date().toISOString(),
    };
  }

  try {
    new URL(url);
    checks.push({
      code: "url_valid",
      level: "info",
      message: "URL is valid",
    });
  } catch {
    checks.push({
      code: "url_valid",
      level: "error",
      message: "URL is malformed",
    });
    return {
      adapterType: "HTTP",
      status: "fail",
      checks,
      testedAt: new Date().toISOString(),
    };
  }

  const reachable = await isUrlReachable(url);
  checks.push({
    code: "url_reachable",
    level: reachable ? "info" : "warn",
    message: reachable
      ? `URL "${url}" is reachable`
      : `URL "${url}" is not reachable`,
  });

  const hasError = checks.some((c) => c.level === "error");
  const hasWarn = checks.some((c) => c.level === "warn");

  return {
    adapterType: "HTTP",
    status: deriveStatus(hasError, hasWarn),
    checks,
    testedAt: new Date().toISOString(),
  };
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

async function isUrlReachable(url: string): Promise<boolean> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REACHABILITY_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: "HEAD",
      signal: controller.signal,
    });
    return response.ok || response.status < 500;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}
