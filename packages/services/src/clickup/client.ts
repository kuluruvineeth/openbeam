import { type RateLimitConfig, rateLimiter } from "@openbeam/redis";
import {
  CLICKUP_API_URL,
  type ClickUpClientConfig,
  type ClickUpRateLimitState,
} from "@openbeam/types/services/connectors/clickup";
import { logger } from "../lib/logger";
import { getValidAccessToken } from "../lib/token-refresh";
import { ClickUpApiError, ClickUpErrorCodes } from "./types";

const DEFAULT_TIMEOUT = 30_000;
const DEFAULT_RETRY_ATTEMPTS = 3;
const BASE_RETRY_DELAY = 1000;
const MAX_RETRY_DELAY = 30_000;

const DEFAULT_RATE_LIMITS: RateLimitConfig = {
  requestsPerMinute: 90,
  requestsPerHour: 4500,
  burstLimit: 20,
};

export interface ClickUpClient {
  readonly connectorId: string;
  get<T>(path: string, params?: Record<string, string>): Promise<T>;
  post<T>(path: string, body?: unknown): Promise<T>;
  put<T>(path: string, body?: unknown): Promise<T>;
  getRateLimitState(): Promise<ClickUpRateLimitState>;
  healthCheck(): Promise<boolean>;
}

interface ClientState {
  lastRateLimitHit?: number;
  consecutiveErrors: number;
}

export function createClickUpClient(
  config: ClickUpClientConfig
): ClickUpClient {
  const {
    connectorId,
    accessToken: providedToken,
    rateLimitConfig = DEFAULT_RATE_LIMITS,
    timeout = DEFAULT_TIMEOUT,
  } = config;

  const state: ClientState = { consecutiveErrors: 0 };
  let cachedToken: string | undefined = providedToken;

  async function getAccessToken(): Promise<string> {
    if (cachedToken) {
      return cachedToken;
    }
    cachedToken = await getValidAccessToken(connectorId);
    return cachedToken;
  }

  async function checkRateLimit(): Promise<void> {
    const { allowed, reason } = await rateLimiter.checkConnectorRateLimit(
      connectorId,
      "clickup",
      rateLimitConfig as RateLimitConfig
    );

    if (!allowed) {
      logger.debug({ reason }, "ClickUp rate limit hit");
      state.lastRateLimitHit = Date.now();

      const quotaAvailable = await rateLimiter.waitForQuota(
        connectorId,
        "clickup",
        rateLimitConfig as RateLimitConfig,
        5
      );

      if (!quotaAvailable) {
        throw new ClickUpApiError({
          message: "Rate limit exceeded",
          code: ClickUpErrorCodes.RATE_LIMITED,
          retryable: true,
          retryAfter: 60,
        });
      }
    }
  }

  function calculateRetryDelay(attempt: number, retryAfter?: number): number {
    if (retryAfter) {
      return retryAfter * 1000;
    }
    const exponentialDelay = BASE_RETRY_DELAY * 2 ** attempt;
    const jitter = Math.random() * 1000;
    return Math.min(exponentialDelay + jitter, MAX_RETRY_DELAY);
  }

  function shouldRetryError(
    error: unknown,
    attempt: number
  ): { retry: boolean; delay?: number } {
    const canRetry = attempt < DEFAULT_RETRY_ATTEMPTS;

    if (error instanceof ClickUpApiError) {
      if (ClickUpApiError.isAuthError(error.code)) {
        return { retry: false };
      }
      return { retry: error.retryable && canRetry, delay: error.retryAfter };
    }

    if (error instanceof Error && error.name === "AbortError") {
      return { retry: canRetry };
    }

    return { retry: false };
  }

  interface RequestOptions {
    method: string;
    path: string;
    params?: Record<string, string>;
    body?: unknown;
  }

  async function request<T>(opts: RequestOptions, attempt = 0): Promise<T> {
    await checkRateLimit();

    const token = await getAccessToken();
    const url = new URL(`${CLICKUP_API_URL}${opts.path}`);
    if (opts.params) {
      for (const [key, value] of Object.entries(opts.params)) {
        url.searchParams.set(key, value);
      }
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url.toString(), {
        method: opts.method,
        headers: {
          Authorization: token,
          "Content-Type": "application/json",
        },
        body: opts.body ? JSON.stringify(opts.body) : undefined,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorBody = await response.text();
        throw ClickUpApiError.fromResponse(response.status, errorBody);
      }

      state.consecutiveErrors = 0;
      return (await response.json()) as T;
    } catch (error) {
      clearTimeout(timeoutId);
      state.consecutiveErrors += 1;

      const { retry, delay } = shouldRetryError(error, attempt);
      if (retry) {
        await sleep(calculateRetryDelay(attempt, delay));
        return request<T>(opts, attempt + 1);
      }

      if (error instanceof ClickUpApiError) {
        throw error;
      }

      if (error instanceof Error && error.name === "AbortError") {
        throw new ClickUpApiError({
          message: "Request timeout",
          code: "TIMEOUT",
        });
      }

      throw new Error(`ClickUp request failed for connector ${connectorId}`, {
        cause: error,
      });
    }
  }

  return {
    connectorId,
    get: <T>(path: string, params?: Record<string, string>) =>
      request<T>({ method: "GET", path, params }),
    post: <T>(path: string, body?: unknown) =>
      request<T>({ method: "POST", path, body }),
    put: <T>(path: string, body?: unknown) =>
      request<T>({ method: "PUT", path, body }),
    async getRateLimitState(): Promise<ClickUpRateLimitState> {
      const quota = await rateLimiter.getRemainingQuota(
        connectorId,
        "clickup",
        rateLimitConfig as RateLimitConfig
      );
      return {
        remaining: quota.minuteRemaining ?? 0,
        resetAt: Date.now() + 60_000,
        retryAfter: state.lastRateLimitHit
          ? Math.max(0, 60_000 - (Date.now() - state.lastRateLimitHit))
          : undefined,
      };
    },
    async healthCheck(): Promise<boolean> {
      try {
        await request<unknown>({ method: "GET", path: "/user" });
        return true;
      } catch (error) {
        logger.debug({ error, connectorId }, "ClickUp health check failed");
        return false;
      }
    },
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export { DEFAULT_RATE_LIMITS, DEFAULT_TIMEOUT };
