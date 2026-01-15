import { type RateLimitConfig, rateLimiter } from "@openplane/redis";
import {
  LINEAR_API_URL,
  type LinearClientConfig,
  type LinearRateLimitState,
} from "@openplane/types/services/connectors/linear";
import { logger } from "../lib/logger";
import { getValidAccessToken } from "../lib/token-refresh";
import { LinearApiError, LinearErrorCodes } from "./types";

const DEFAULT_TIMEOUT = 30_000;
const DEFAULT_RETRY_ATTEMPTS = 3;
const BASE_RETRY_DELAY = 1000;
const MAX_RETRY_DELAY = 30_000;

const DEFAULT_RATE_LIMITS: RateLimitConfig = {
  requestsPerMinute: 50,
  requestsPerHour: 1500,
  burstLimit: 20,
};

export interface LinearClient {
  readonly connectorId: string;
  query<T>(query: string, variables?: Record<string, unknown>): Promise<T>;
  mutation<T>(
    mutation: string,
    variables?: Record<string, unknown>
  ): Promise<T>;
  getRateLimitState(): Promise<LinearRateLimitState>;
  healthCheck(): Promise<boolean>;
}

interface ClientState {
  lastRateLimitHit?: number;
  consecutiveErrors: number;
}

export function createLinearClient(config: LinearClientConfig): LinearClient {
  const {
    connectorId,
    rateLimitConfig = DEFAULT_RATE_LIMITS,
    timeout = DEFAULT_TIMEOUT,
    debug = false,
  } = config;

  const state: ClientState = { consecutiveErrors: 0 };

  async function getAccessToken(): Promise<string> {
    return await getValidAccessToken(connectorId);
  }

  async function checkRateLimit(): Promise<void> {
    const { allowed, reason } = await rateLimiter.checkConnectorRateLimit(
      connectorId,
      "linear",
      rateLimitConfig as RateLimitConfig
    );

    if (!allowed) {
      if (debug) {
        logger.debug({ reason }, "Linear rate limit hit");
      }
      state.lastRateLimitHit = Date.now();

      const quotaAvailable = await rateLimiter.waitForQuota(
        connectorId,
        "linear",
        rateLimitConfig as RateLimitConfig,
        5
      );

      if (!quotaAvailable) {
        throw new LinearApiError({
          message: "Rate limit exceeded",
          code: LinearErrorCodes.RATE_LIMITED,
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

    if (error instanceof LinearApiError) {
      if (LinearApiError.isAuthError(error.code)) {
        return { retry: false };
      }
      return { retry: error.retryable && canRetry, delay: error.retryAfter };
    }

    if (error instanceof Error && error.name === "AbortError") {
      return { retry: canRetry };
    }

    return { retry: false };
  }

  async function fetchGraphQL<T>(
    operation: string,
    variables?: Record<string, unknown>
  ): Promise<T> {
    await checkRateLimit();

    const token = await getAccessToken();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(LINEAR_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: operation, variables }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const json = (await response.json()) as {
      errors?: Array<{
        message: string;
        extensions?: { code?: string; retryAfter?: number };
      }>;
      data?: T;
    };

    const firstError = json.errors?.[0];
    if (firstError) {
      throw LinearApiError.fromGraphQLError(firstError);
    }

    if (!json.data) {
      throw new LinearApiError({
        message: "No data in GraphQL response",
        code: "EMPTY_RESPONSE",
      });
    }

    return json.data;
  }

  async function executeGraphQL<T>(
    operation: string,
    variables?: Record<string, unknown>,
    attempt = 0
  ): Promise<T> {
    try {
      const result = await fetchGraphQL<T>(operation, variables);
      state.consecutiveErrors = 0;
      return result;
    } catch (error) {
      state.consecutiveErrors += 1;

      const { retry, delay } = shouldRetryError(error, attempt);
      if (retry) {
        await sleep(calculateRetryDelay(attempt, delay));
        return executeGraphQL<T>(operation, variables, attempt + 1);
      }

      if (error instanceof Error && error.name === "AbortError") {
        throw new LinearApiError({
          message: "Request timeout",
          code: "timeout",
        });
      }

      throw error;
    }
  }

  async function getRateLimitState(): Promise<LinearRateLimitState> {
    const quota = await rateLimiter.getRemainingQuota(
      connectorId,
      "linear",
      rateLimitConfig as RateLimitConfig
    );

    return {
      remaining: quota.minuteRemaining ?? 0,
      resetAt: Date.now() + 60_000,
      retryAfter: state.lastRateLimitHit
        ? Math.max(0, 60_000 - (Date.now() - state.lastRateLimitHit))
        : undefined,
    };
  }

  async function healthCheck(): Promise<boolean> {
    try {
      await executeGraphQL<{ viewer: { id: string } }>(
        "query { viewer { id } }"
      );
      return true;
    } catch (error) {
      logger.debug({ error, connectorId }, "Linear health check failed");
      return false;
    }
  }

  return {
    connectorId,
    query: executeGraphQL,
    mutation: executeGraphQL,
    getRateLimitState,
    healthCheck,
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export { DEFAULT_RATE_LIMITS, DEFAULT_TIMEOUT };
