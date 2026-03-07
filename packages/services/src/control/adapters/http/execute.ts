import type { AdapterExecutionResult } from "@openbeam/types/control/adapters";
import type { AdapterExecutionOptions } from "../types";
import { asNumber, asString, parseJsonSafe } from "../utils";

const DEFAULT_TIMEOUT_MS = 30_000;

export async function executeHttp(
  opts: AdapterExecutionOptions
): Promise<AdapterExecutionResult> {
  const config = opts.config;
  const url = asString(config.url);
  if (!url) {
    return {
      exitCode: null,
      signal: null,
      timedOut: false,
      errorMessage: "No URL specified in adapter config",
      errorCode: "missing_url",
    };
  }

  const method = asString(config.method, "POST").toUpperCase();
  const timeoutMs =
    asNumber(config.timeoutSec, DEFAULT_TIMEOUT_MS / 1000) * 1000;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (config.headers && typeof config.headers === "object") {
    for (const [key, value] of Object.entries(
      config.headers as Record<string, unknown>
    )) {
      if (typeof value === "string") {
        headers[key] = value;
      }
    }
  }

  if (opts.env.AUTHORIZATION) {
    headers.Authorization = opts.env.AUTHORIZATION;
  }

  const body = buildPayload(opts);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method,
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    const responseText = await response.text();
    const responseJson = parseJsonSafe(responseText);

    await opts.onLog({
      stream: "stdout",
      chunk: responseText.slice(0, 32_768),
    });

    if (!response.ok) {
      return {
        exitCode: response.status,
        signal: null,
        timedOut: false,
        errorMessage: `HTTP ${response.status}: ${responseText.slice(0, 512)}`,
        errorCode: "http_error",
        resultJson: responseJson as Record<string, unknown> | undefined,
      };
    }

    return {
      exitCode: 0,
      signal: null,
      timedOut: false,
      resultJson: responseJson as Record<string, unknown> | undefined,
    };
  } catch (err) {
    const isAbort = err instanceof Error && err.name === "AbortError";
    return {
      exitCode: null,
      signal: null,
      timedOut: isAbort,
      errorMessage: err instanceof Error ? err.message : "HTTP request failed",
      errorCode: isAbort ? "timeout" : "network_error",
    };
  } finally {
    clearTimeout(timeout);
  }
}

function buildPayload(opts: AdapterExecutionOptions): Record<string, unknown> {
  const template = opts.config.payloadTemplate;

  if (template && typeof template === "object") {
    return {
      ...(template as Record<string, unknown>),
      runId: opts.runId,
      context: opts.context,
    };
  }

  return {
    runId: opts.runId,
    context: opts.context,
  };
}
