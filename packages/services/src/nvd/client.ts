import { type RateLimitConfig, rateLimiter } from "@openbeam/redis";
import {
  NVD_API_BASE,
  NVD_RATE_LIMIT_NO_KEY,
  NVD_RATE_LIMIT_WINDOW_MS,
  NVD_RATE_LIMIT_WITH_KEY,
  type NvdClientConfig,
} from "@openbeam/types/services/connectors/nvd";
import { logger } from "../lib/logger";
import { NvdApiError } from "./types";

const DEFAULT_TIMEOUT = 120_000;
const DEFAULT_RETRY_ATTEMPTS = 5;
const BASE_RETRY_DELAY = 1000;
const MAX_RETRY_DELAY = 30_000;

export interface NvdClient {
  readonly connectorId: string;
  readonly apiKey?: string;
  get<T>(params?: Record<string, string>): Promise<T>;
  healthCheck(): Promise<boolean>;
}

function buildRateLimitConfig(hasApiKey: boolean): RateLimitConfig {
  const requestsPerWindow = hasApiKey
    ? NVD_RATE_LIMIT_WITH_KEY
    : NVD_RATE_LIMIT_NO_KEY;
  const windowSeconds = NVD_RATE_LIMIT_WINDOW_MS / 1000;
  const requestsPerMinute = Math.floor(
    (requestsPerWindow / windowSeconds) * 60
  );

  return {
    requestsPerMinute,
    requestsPerHour: requestsPerMinute * 60,
    burstLimit: Math.max(2, Math.floor(requestsPerMinute / 3)),
  };
}

function calculateRetryDelay(attempt: number, retryAfter?: number): number {
  if (retryAfter) {
    return retryAfter * 1000;
  }
  const exponentialDelay = BASE_RETRY_DELAY * 2 ** attempt;
  const jitter = Math.random() * 1000;
  return Math.min(exponentialDelay + jitter, MAX_RETRY_DELAY);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function createNvdClient(config: NvdClientConfig): NvdClient {
  const { connectorId, apiKey, timeout = DEFAULT_TIMEOUT } = config;
  const rateLimitConfig = buildRateLimitConfig(Boolean(apiKey));

  async function checkRateLimit(): Promise<void> {
    const { allowed } = await rateLimiter.checkConnectorRateLimit(
      connectorId,
      "nvd",
      rateLimitConfig
    );

    if (!allowed) {
      const quotaAvailable = await rateLimiter.waitForQuota(
        connectorId,
        "nvd",
        rateLimitConfig,
        5
      );

      if (!quotaAvailable) {
        throw new NvdApiError({
          message: "NVD rate limit exceeded",
          code: "RATE_LIMITED",
          retryable: true,
          retryAfter: 30,
        });
      }
    }
  }

  function shouldRetry(
    error: unknown,
    attempt: number
  ): { retry: boolean; delay?: number } {
    if (attempt >= DEFAULT_RETRY_ATTEMPTS) {
      return { retry: false };
    }

    if (error instanceof NvdApiError) {
      return { retry: error.retryable, delay: error.retryAfter };
    }

    if (error instanceof Error && error.name === "AbortError") {
      return { retry: true };
    }

    return { retry: false };
  }

  async function fetchApi<T>(params?: Record<string, string>): Promise<T> {
    await checkRateLimit();

    const url = new URL(NVD_API_BASE);
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        url.searchParams.set(key, value);
      }
    }

    const headers: Record<string, string> = {};
    if (apiKey) {
      headers.apiKey = apiKey;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url.toString(), {
        method: "GET",
        headers,
        signal: controller.signal,
      });

      if (!response.ok) {
        const retryAfter = response.headers.get("Retry-After");
        throw NvdApiError.fromHttpStatus(
          response.status,
          retryAfter ? Number.parseInt(retryAfter, 10) : undefined
        );
      }

      return (await response.json()) as T;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async function executeRequest<T>(
    params?: Record<string, string>,
    attempt = 0
  ): Promise<T> {
    try {
      return await fetchApi<T>(params);
    } catch (error) {
      const { retry, delay } = shouldRetry(error, attempt);
      if (retry) {
        await sleep(calculateRetryDelay(attempt, delay));
        return executeRequest<T>(params, attempt + 1);
      }

      if (error instanceof Error && error.name === "AbortError") {
        throw new NvdApiError({
          message: "NVD API request timeout",
          code: "TIMEOUT",
          retryable: true,
        });
      }

      throw error;
    }
  }

  async function healthCheck(): Promise<boolean> {
    try {
      await executeRequest({ resultsPerPage: "1", startIndex: "0" });
      return true;
    } catch (error) {
      logger.debug({ error, connectorId }, "NVD health check failed");
      return false;
    }
  }

  return {
    connectorId,
    apiKey,
    get: executeRequest,
    healthCheck,
  };
}
