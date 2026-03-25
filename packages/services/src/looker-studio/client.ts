import { type RateLimitConfig, rateLimiter } from "@openbeam/redis";
import type {
  LookerStudioClientConfig,
  LookerStudioRateLimitState,
} from "@openbeam/types/services/connectors/looker-studio";
import { logger } from "../lib/logger";
import { getValidAccessToken } from "../lib/token-refresh";
import { LookerStudioApiError, LookerStudioErrorCodes } from "./types";

const DRIVE_API_BASE = "https://www.googleapis.com/drive/v3";
const DEFAULT_TIMEOUT = 30_000;
const DEFAULT_RETRY_ATTEMPTS = 3;
const BASE_RETRY_DELAY = 1000;
const MAX_RETRY_DELAY = 30_000;

const DEFAULT_RATE_LIMITS: RateLimitConfig = {
  requestsPerMinute: 100,
  requestsPerHour: 10_000,
  burstLimit: 30,
};

type DriveParamValue = string | number | boolean | string[] | undefined;

export interface LookerStudioClient {
  readonly connectorId: string;
  readonly userEmail?: string;
  get<T>(path: string, params?: Record<string, DriveParamValue>): Promise<T>;
  getRateLimitState(): Promise<LookerStudioRateLimitState>;
  healthCheck(): Promise<boolean>;
}

interface ClientState {
  lastRateLimitHit?: number;
  consecutiveErrors: number;
}

export function createLookerStudioClient(
  config: LookerStudioClientConfig
): LookerStudioClient {
  const {
    connectorId,
    accessToken: providedToken,
    userEmail,
    rateLimitConfig = DEFAULT_RATE_LIMITS,
    timeout = DEFAULT_TIMEOUT,
    debug = false,
  } = config;

  const state: ClientState = {
    consecutiveErrors: 0,
  };

  let cachedToken: string | undefined = providedToken;

  async function getAccessToken(): Promise<string> {
    if (cachedToken) {
      return cachedToken;
    }
    cachedToken = await getValidAccessToken(connectorId);
    return cachedToken;
  }

  async function checkRateLimit(method: string): Promise<void> {
    const { allowed, reason } = await rateLimiter.checkConnectorRateLimit(
      connectorId,
      "looker-studio",
      rateLimitConfig as RateLimitConfig
    );

    if (!allowed) {
      if (debug) {
        logger.debug({ method, reason }, "Looker Studio rate limit hit");
      }

      state.lastRateLimitHit = Date.now();

      const quotaAvailable = await rateLimiter.waitForQuota(
        connectorId,
        "looker-studio",
        rateLimitConfig as RateLimitConfig,
        5
      );

      if (!quotaAvailable) {
        throw new LookerStudioApiError({
          message: `Rate limit exceeded for ${method}`,
          code: LookerStudioErrorCodes.RATE_LIMITED,
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

  function buildUrl(
    path: string,
    params?: Record<string, DriveParamValue>
  ): string {
    const url = new URL(`${DRIVE_API_BASE}${path}`);
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value === undefined) {
          continue;
        }
        if (Array.isArray(value)) {
          for (const item of value) {
            url.searchParams.append(key, item);
          }
        } else {
          url.searchParams.set(key, String(value));
        }
      }
    }
    return url.toString();
  }

  interface RequestContext {
    method: "GET";
    path: string;
    params?: Record<string, DriveParamValue>;
    attempt: number;
  }

  async function executeRequest<T>(
    path: string,
    params?: Record<string, DriveParamValue>,
    attempt = 0
  ): Promise<T> {
    try {
      await checkRateLimit(path);

      const token = await getAccessToken();
      const url = buildUrl(path, params);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorBody = (await response.json().catch(() => ({}))) as {
          error?: { message?: string; code?: number; status?: string };
        };
        throw LookerStudioApiError.fromResponse(response.status, errorBody);
      }

      state.consecutiveErrors = 0;
      return (await response.json()) as T;
    } catch (error) {
      return handleRetryableError<T>(error, {
        method: "GET",
        path,
        params,
        attempt,
      });
    }
  }

  function shouldRetry(
    error: unknown,
    attempt: number
  ): { retry: boolean; delay?: number } {
    const canRetry = attempt < DEFAULT_RETRY_ATTEMPTS;

    if (error instanceof LookerStudioApiError) {
      if (LookerStudioApiError.isAuthError(error.code)) {
        return { retry: false };
      }
      return { retry: error.retryable && canRetry, delay: error.retryAfter };
    }

    if (error instanceof Error && error.name === "AbortError") {
      return { retry: canRetry };
    }

    return { retry: canRetry };
  }

  async function handleRetryableError<T>(
    error: unknown,
    ctx: RequestContext
  ): Promise<T> {
    state.consecutiveErrors += 1;

    const { retry, delay } = shouldRetry(error, ctx.attempt);

    if (retry) {
      const retryDelay = calculateRetryDelay(ctx.attempt, delay);
      if (debug) {
        logger.debug(
          { path: ctx.path, delay: retryDelay, attempt: ctx.attempt + 1 },
          "Looker Studio retrying request"
        );
      }
      await sleep(retryDelay);
      return await executeRequest<T>(ctx.path, ctx.params, ctx.attempt + 1);
    }

    if (error instanceof Error && error.name === "AbortError") {
      throw new LookerStudioApiError({
        message: "Request timeout",
        code: "timeout",
      });
    }

    throw error instanceof LookerStudioApiError
      ? error
      : new Error(
          `Looker Studio GET ${ctx.path} failed for connector ${connectorId}`,
          { cause: error }
        );
  }

  async function get<T>(
    path: string,
    params?: Record<string, DriveParamValue>
  ): Promise<T> {
    return await executeRequest<T>(path, params);
  }

  async function getRateLimitState(): Promise<LookerStudioRateLimitState> {
    const quota = await rateLimiter.getRemainingQuota(
      connectorId,
      "looker-studio",
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
      await get("/about", { fields: "user" });
      return true;
    } catch (error) {
      logger.debug({ error, connectorId }, "Looker Studio health check failed");
      return false;
    }
  }

  return {
    connectorId,
    userEmail,
    get,
    getRateLimitState,
    healthCheck,
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export { DEFAULT_RATE_LIMITS, DEFAULT_TIMEOUT };
