import { type RateLimitConfig, rateLimiter } from "@openbeam/redis";
import {
  BITBUCKET_API_URL,
  type BitbucketClientConfig,
  type BitbucketRateLimitState,
} from "@openbeam/types/services/connectors/bitbucket";
import { logger } from "../lib/logger";
import { getValidAccessToken } from "../lib/token-refresh";
import { BitbucketApiError, BitbucketErrorCodes } from "./types";

const DEFAULT_TIMEOUT = 30_000;
const DEFAULT_RETRY_ATTEMPTS = 3;
const BASE_RETRY_DELAY = 1000;
const MAX_RETRY_DELAY = 30_000;

const DEFAULT_RATE_LIMITS: RateLimitConfig = {
  requestsPerMinute: 15,
  requestsPerHour: 900,
  burstLimit: 10,
};

export interface BitbucketClient {
  readonly connectorId: string;
  readonly workspace: string;
  get<T>(path: string, query?: Record<string, string>): Promise<T>;
  post<T>(path: string, body?: unknown): Promise<T>;
  getFullUrl<T>(url: string): Promise<T>;
  getRateLimitState(): Promise<BitbucketRateLimitState>;
  healthCheck(): Promise<boolean>;
}

interface ClientState {
  lastRateLimitHit?: number;
  consecutiveErrors: number;
}

export function createBitbucketClient(
  config: BitbucketClientConfig
): BitbucketClient {
  const {
    connectorId,
    accessToken: providedToken,
    workspace,
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
      "bitbucket",
      DEFAULT_RATE_LIMITS
    );

    if (!allowed) {
      if (debug) {
        logger.debug({ reason }, "Bitbucket rate limit hit");
      }
      state.lastRateLimitHit = Date.now();

      const quotaAvailable = await rateLimiter.waitForQuota(
        connectorId,
        "bitbucket",
        DEFAULT_RATE_LIMITS,
        5
      );

      if (!quotaAvailable) {
        throw new BitbucketApiError({
          message: "Rate limit exceeded",
          code: BitbucketErrorCodes.RATE_LIMITED,
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

    if (error instanceof BitbucketApiError) {
      if (BitbucketApiError.isAuthError(error.code)) {
        return { retry: false };
      }
      return { retry: error.retryable && canRetry, delay: error.retryAfter };
    }

    if (error instanceof Error && error.name === "AbortError") {
      return { retry: canRetry };
    }

    return { retry: false };
  }

  async function fetchRest<T>(
    method: string,
    url: string,
    query?: Record<string, string>,
    body?: unknown
  ): Promise<T> {
    await checkRateLimit();
    const token = await getAccessToken();

    const fullUrl = new URL(
      url.startsWith("http") ? url : `${BITBUCKET_API_URL}${url}`
    );
    if (query) {
      for (const [key, value] of Object.entries(query)) {
        fullUrl.searchParams.set(key, value);
      }
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(fullUrl.toString(), {
      method,
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorBody = (await response.json().catch(() => ({}))) as {
        error?: { message?: string };
      };

      const apiError = BitbucketApiError.fromHttpResponse(
        response.status,
        errorBody
      );

      if (BitbucketApiError.isRateLimitError(apiError.code)) {
        const retryAfter = response.headers.get("retry-after");
        if (retryAfter) {
          const seconds = Number.parseInt(retryAfter, 10);
          if (!Number.isNaN(seconds)) {
            throw new BitbucketApiError({
              message: apiError.message,
              code: apiError.code,
              retryable: true,
              retryAfter: seconds,
              status: response.status,
            });
          }
        }
      }

      throw apiError;
    }

    return (await response.json()) as T;
  }

  interface RestRequest {
    method: string;
    url: string;
    query?: Record<string, string>;
    body?: unknown;
    attempt?: number;
  }

  async function executeRest<T>(request: RestRequest): Promise<T> {
    const { method, url, query, body, attempt = 0 } = request;

    try {
      const result = await fetchRest<T>(method, url, query, body);
      state.consecutiveErrors = 0;
      return result;
    } catch (error) {
      state.consecutiveErrors += 1;

      const { retry, delay } = shouldRetryError(error, attempt);
      if (retry) {
        await sleep(calculateRetryDelay(attempt, delay));
        return executeRest<T>({ ...request, attempt: attempt + 1 });
      }

      if (error instanceof Error && error.name === "AbortError") {
        throw new BitbucketApiError({
          message: "Request timeout",
          code: "TIMEOUT",
          retryable: true,
        });
      }

      throw error;
    }
  }

  async function getRateLimitState(): Promise<BitbucketRateLimitState> {
    const quota = await rateLimiter.getRemainingQuota(
      connectorId,
      "bitbucket",
      DEFAULT_RATE_LIMITS
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
      await executeRest<unknown>({
        method: "GET",
        url: `/repositories/${workspace}`,
        query: { pagelen: "1" },
      });
      return true;
    } catch (error) {
      logger.debug({ error, connectorId }, "Bitbucket health check failed");
      return false;
    }
  }

  return {
    connectorId,
    workspace,
    get<T>(path: string, query?: Record<string, string>): Promise<T> {
      return executeRest<T>({ method: "GET", url: path, query });
    },
    post<T>(path: string, body?: unknown): Promise<T> {
      return executeRest<T>({ method: "POST", url: path, body });
    },
    getFullUrl<T>(url: string): Promise<T> {
      return executeRest<T>({ method: "GET", url });
    },
    getRateLimitState,
    healthCheck,
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
