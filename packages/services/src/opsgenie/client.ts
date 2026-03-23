import { type RateLimitConfig, rateLimiter } from "@openbeam/redis";
import {
  OPSGENIE_API_BASE_EU,
  OPSGENIE_API_BASE_US,
  type OpsGenieClientConfig,
} from "@openbeam/types/services/connectors/opsgenie";
import { logger } from "../lib/logger";
import { OpsGenieApiError } from "./types";

const DEFAULT_TIMEOUT = 30_000;
const DEFAULT_RETRY_ATTEMPTS = 3;
const BASE_RETRY_DELAY = 1000;
const MAX_RETRY_DELAY = 30_000;

const RATE_LIMITS: RateLimitConfig = {
  requestsPerMinute: 4000,
  requestsPerHour: 240_000,
  burstLimit: 200,
};

export interface OpsGenieClient {
  readonly connectorId: string;
  get<T>(path: string, params?: Record<string, string>): Promise<T>;
  post<T>(path: string, body: unknown): Promise<T>;
  healthCheck(): Promise<boolean>;
}

export function createOpsGenieClient(
  config: OpsGenieClientConfig
): OpsGenieClient {
  const {
    connectorId,
    apiKey,
    region = "us",
    timeout = DEFAULT_TIMEOUT,
  } = config;
  const baseUrl = region === "eu" ? OPSGENIE_API_BASE_EU : OPSGENIE_API_BASE_US;

  async function checkRateLimit(): Promise<void> {
    const { allowed } = await rateLimiter.checkConnectorRateLimit(
      connectorId,
      "opsgenie",
      RATE_LIMITS
    );

    if (!allowed) {
      const quotaAvailable = await rateLimiter.waitForQuota(
        connectorId,
        "opsgenie",
        RATE_LIMITS,
        5
      );

      if (!quotaAvailable) {
        throw new OpsGenieApiError({
          message: "Rate limit exceeded",
          code: "RATE_LIMITED",
          retryable: true,
          retryAfter: 60,
        });
      }
    }
  }

  async function fetchJson<T>(
    path: string,
    params?: Record<string, string>,
    attempt = 0
  ): Promise<T> {
    await checkRateLimit();

    const url = new URL(`${baseUrl}${path}`);
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== "") {
          url.searchParams.set(key, value);
        }
      }
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    let response: Response;
    try {
      response = await fetch(url.toString(), {
        headers: {
          Authorization: `GenieKey ${apiKey}`,
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }

    if (response.status === 429) {
      const retryAfter = Number.parseInt(
        response.headers.get("X-RateLimit-Period-In-Sec") ?? "60",
        10
      );
      if (attempt < DEFAULT_RETRY_ATTEMPTS) {
        await sleep(Math.min(retryAfter * 1000, MAX_RETRY_DELAY));
        return fetchJson<T>(path, params, attempt + 1);
      }
      throw new OpsGenieApiError({
        message: "Rate limited",
        code: "RATE_LIMITED",
        statusCode: 429,
        retryable: true,
        retryAfter,
      });
    }

    if (response.status === 401) {
      throw new OpsGenieApiError({
        message: "Unauthorized - invalid GenieKey",
        code: "UNAUTHORIZED",
        statusCode: 401,
        retryable: false,
      });
    }

    if (response.status === 403) {
      throw new OpsGenieApiError({
        message: "Forbidden - insufficient permissions",
        code: "FORBIDDEN",
        statusCode: 403,
        retryable: false,
      });
    }

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      if (response.status >= 500 && attempt < DEFAULT_RETRY_ATTEMPTS) {
        const delay = Math.min(
          BASE_RETRY_DELAY * 2 ** attempt + Math.random() * BASE_RETRY_DELAY,
          MAX_RETRY_DELAY
        );
        logger.warn(
          { connectorId, status: response.status, attempt },
          "OpsGenie API server error, retrying"
        );
        await sleep(delay);
        return fetchJson<T>(path, params, attempt + 1);
      }
      throw new OpsGenieApiError({
        message: `OpsGenie API ${response.status}: ${body}`,
        code: "API_ERROR",
        statusCode: response.status,
        retryable: false,
      });
    }

    return response.json() as Promise<T>;
  }

  async function postJson<T>(path: string, body: unknown): Promise<T> {
    await checkRateLimit();

    const url = `${baseUrl}${path}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    let response: Response;
    try {
      response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `GenieKey ${apiKey}`,
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new OpsGenieApiError({
        message: `OpsGenie API POST ${response.status}: ${text}`,
        code: response.status === 429 ? "RATE_LIMITED" : "API_ERROR",
        statusCode: response.status,
        retryable: response.status >= 500,
      });
    }

    if (response.status === 202) {
      return { requestId: response.headers.get("X-Request-Id") } as T;
    }

    return response.json() as Promise<T>;
  }

  async function healthCheck(): Promise<boolean> {
    try {
      await fetchJson("/heartbeats");
      return true;
    } catch (error) {
      if (error instanceof OpsGenieApiError && error.statusCode === 404) {
        return true;
      }
      if (
        error instanceof OpsGenieApiError &&
        OpsGenieApiError.isAuthError(error.code)
      ) {
        return false;
      }
      try {
        await fetchJson("/services", { limit: "1" });
        return true;
      } catch {
        return false;
      }
    }
  }

  return {
    connectorId,
    get: fetchJson,
    post: postJson,
    healthCheck,
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
