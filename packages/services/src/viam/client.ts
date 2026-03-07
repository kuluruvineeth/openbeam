import { type RateLimitConfig, rateLimiter } from "@openbeam/redis";
import type { ViamClientConfig } from "@openbeam/types/services/connectors/viam";
import { logger } from "../lib/logger";
import { ViamApiError } from "./types";

const VIAM_API_BASE = "https://app.viam.com/api/v1";
const DEFAULT_TIMEOUT = 30_000;
const DEFAULT_RETRY_ATTEMPTS = 3;
const BASE_RETRY_DELAY = 1000;
const MAX_RETRY_DELAY = 30_000;

const RATE_LIMITS: RateLimitConfig = {
  requestsPerMinute: 120,
  requestsPerHour: 5000,
  burstLimit: 20,
};

export interface ViamClient {
  readonly connectorId: string;
  get<T>(path: string, params?: Record<string, string>): Promise<T>;
  healthCheck(): Promise<boolean>;
}

export function createViamClient(config: ViamClientConfig): ViamClient {
  const {
    connectorId,
    apiKey,
    apiKeyId,
    baseUrl = VIAM_API_BASE,
    timeout = DEFAULT_TIMEOUT,
  } = config;

  async function checkRateLimit(): Promise<void> {
    const { allowed } = await rateLimiter.checkConnectorRateLimit(
      connectorId,
      "viam",
      RATE_LIMITS
    );

    if (!allowed) {
      const quotaAvailable = await rateLimiter.waitForQuota(
        connectorId,
        "viam",
        RATE_LIMITS,
        5
      );

      if (!quotaAvailable) {
        throw new ViamApiError({
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
        url.searchParams.set(key, value);
      }
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    let response: Response;
    try {
      response = await fetch(url.toString(), {
        headers: {
          "key-id": apiKeyId,
          key: apiKey,
          "Content-Type": "application/json",
        },
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }

    if (response.status === 429) {
      const retryAfter = Number.parseInt(
        response.headers.get("Retry-After") ?? "60",
        10
      );
      if (attempt < DEFAULT_RETRY_ATTEMPTS) {
        await sleep(Math.min(retryAfter * 1000, MAX_RETRY_DELAY));
        return fetchJson<T>(path, params, attempt + 1);
      }
      throw new ViamApiError({
        message: "Rate limited",
        code: "RATE_LIMITED",
        retryable: true,
        retryAfter,
      });
    }

    if (response.status === 401 || response.status === 403) {
      throw new ViamApiError({
        message: `Unauthorized: ${response.status}`,
        code: response.status === 401 ? "UNAUTHORIZED" : "FORBIDDEN",
        retryable: false,
      });
    }

    if (!response.ok) {
      const body = await response.text();
      if (response.status >= 500 && attempt < DEFAULT_RETRY_ATTEMPTS) {
        const delay = Math.min(
          BASE_RETRY_DELAY * 2 ** attempt,
          MAX_RETRY_DELAY
        );
        logger.warn(
          { status: response.status, attempt, delay },
          "Viam API server error, retrying"
        );
        await sleep(delay);
        return fetchJson<T>(path, params, attempt + 1);
      }
      throw new ViamApiError({
        message: `Viam API ${response.status}: ${body}`,
        code: "API_ERROR",
        retryable: false,
      });
    }

    return response.json() as Promise<T>;
  }

  async function healthCheck(): Promise<boolean> {
    try {
      await fetchJson("/organizations");
      return true;
    } catch {
      return false;
    }
  }

  return {
    connectorId,
    get: fetchJson,
    healthCheck,
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
