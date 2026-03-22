import { type RateLimitConfig, rateLimiter } from "@openbeam/redis";
import {
  MONDAY_API_URL,
  type MondayClientConfig,
  type MondayRateLimitState,
} from "@openbeam/types/services/connectors/monday";
import { logger } from "../lib/logger";
import { getValidAccessToken } from "../lib/token-refresh";
import { MondayApiError, MondayErrorCodes } from "./types";

const DEFAULT_TIMEOUT = 30_000;
const DEFAULT_RETRY_ATTEMPTS = 3;
const BASE_RETRY_DELAY = 1000;
const MAX_RETRY_DELAY = 30_000;

const DEFAULT_RATE_LIMITS: RateLimitConfig = {
  requestsPerMinute: 40,
  requestsPerHour: 1200,
  burstLimit: 15,
};

export interface MondayClient {
  readonly connectorId: string;
  query<T>(query: string, variables?: Record<string, unknown>): Promise<T>;
  getRateLimitState(): Promise<MondayRateLimitState>;
  healthCheck(): Promise<boolean>;
}

interface ClientState {
  lastRateLimitHit?: number;
  consecutiveErrors: number;
}

export function createMondayClient(config: MondayClientConfig): MondayClient {
  const {
    connectorId,
    accessToken: providedToken,
    rateLimitConfig = DEFAULT_RATE_LIMITS,
    timeout = DEFAULT_TIMEOUT,
    debug = false,
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
      "monday",
      rateLimitConfig as RateLimitConfig
    );

    if (!allowed) {
      if (debug) {
        logger.debug({ reason }, "Monday rate limit hit");
      }
      state.lastRateLimitHit = Date.now();

      const quotaAvailable = await rateLimiter.waitForQuota(
        connectorId,
        "monday",
        rateLimitConfig as RateLimitConfig,
        5
      );

      if (!quotaAvailable) {
        throw new MondayApiError({
          message: "Rate limit exceeded",
          code: MondayErrorCodes.RATE_LIMITED,
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

    if (error instanceof MondayApiError) {
      if (MondayApiError.isAuthError(error.code)) {
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

    const response = await fetch(MONDAY_API_URL, {
      method: "POST",
      headers: {
        Authorization: token,
        "Content-Type": "application/json",
        "API-Version": "2024-10",
      },
      body: JSON.stringify({ query: operation, variables }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (response.status === 429) {
      const retryAfter = response.headers.get("Retry-After");
      throw new MondayApiError({
        message: "Rate limited",
        code: MondayErrorCodes.RATE_LIMITED,
        retryable: true,
        retryAfter: retryAfter ? Number.parseInt(retryAfter, 10) : 60,
      });
    }

    if (response.status === 401 || response.status === 403) {
      throw new MondayApiError({
        message: `Authentication failed: ${response.status}`,
        code: MondayErrorCodes.UNAUTHORIZED,
        retryable: false,
      });
    }

    const json = (await response.json()) as {
      errors?: Array<{
        message: string;
        extensions?: { code?: string; retry_after?: number };
      }>;
      data?: T;
    };

    const firstError = json.errors?.[0];
    if (firstError) {
      throw MondayApiError.fromGraphQLError(firstError);
    }

    if (!json.data) {
      throw new MondayApiError({
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
        throw new MondayApiError({
          message: "Request timeout",
          code: "timeout",
        });
      }

      throw new Error(
        `Monday GraphQL request failed for connector ${connectorId}`,
        { cause: error }
      );
    }
  }

  async function getRateLimitState(): Promise<MondayRateLimitState> {
    const quota = await rateLimiter.getRemainingQuota(
      connectorId,
      "monday",
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
      await executeGraphQL<{ me: { id: number } }>("query { me { id } }");
      return true;
    } catch (error) {
      logger.debug({ error, connectorId }, "Monday health check failed");
      return false;
    }
  }

  return {
    connectorId,
    query: executeGraphQL,
    getRateLimitState,
    healthCheck,
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export { DEFAULT_RATE_LIMITS, DEFAULT_TIMEOUT };
