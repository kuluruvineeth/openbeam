import { type RateLimitConfig, rateLimiter } from "@openplane/redis";
import { logger } from "../lib/logger";
import { getValidAccessToken } from "../lib/token-refresh";
import {
  NOTION_API_BASE,
  NOTION_API_VERSION,
  NotionApiError,
  type NotionClientConfig,
  NotionErrorCodes,
  type NotionRateLimitState,
} from "./types";

const DEFAULT_TIMEOUT = 30_000;
const DEFAULT_RETRY_ATTEMPTS = 3;
const BASE_RETRY_DELAY = 1000;
const MAX_RETRY_DELAY = 30_000;

const DEFAULT_RATE_LIMITS: RateLimitConfig = {
  requestsPerMinute: 30,
  requestsPerHour: 1000,
  burstLimit: 10,
};

type NotionParamValue = string | number | boolean | undefined;

export interface NotionClient {
  readonly connectorId: string;
  get<T>(path: string, params?: Record<string, NotionParamValue>): Promise<T>;
  post<T>(path: string, body?: unknown): Promise<T>;
  patch<T>(path: string, body?: unknown): Promise<T>;
  delete(path: string): Promise<void>;
  getRateLimitState(): Promise<NotionRateLimitState>;
  healthCheck(): Promise<boolean>;
}

interface ClientState {
  lastRateLimitHit?: number;
  consecutiveErrors: number;
  lastError?: Error;
}

export function createNotionClient(config: NotionClientConfig): NotionClient {
  const {
    connectorId,
    rateLimitConfig = DEFAULT_RATE_LIMITS,
    timeout = DEFAULT_TIMEOUT,
    debug = false,
  } = config;

  const state: ClientState = {
    consecutiveErrors: 0,
  };

  async function getAccessToken(): Promise<string> {
    return await getValidAccessToken(connectorId);
  }

  async function checkRateLimit(method: string): Promise<void> {
    const { allowed, reason } = await rateLimiter.checkConnectorRateLimit(
      connectorId,
      "notion",
      rateLimitConfig as RateLimitConfig
    );

    if (!allowed) {
      if (debug) {
        logger.debug({ method, reason }, "Notion rate limit hit");
      }

      state.lastRateLimitHit = Date.now();

      const quotaAvailable = await rateLimiter.waitForQuota(
        connectorId,
        "notion",
        rateLimitConfig as RateLimitConfig,
        5
      );

      if (!quotaAvailable) {
        throw new NotionApiError({
          message: `Rate limit exceeded for ${method}`,
          code: NotionErrorCodes.RATE_LIMITED,
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
    params?: Record<string, NotionParamValue>
  ): string {
    const normalizedPath = path.startsWith("/") ? path : `/${path}`;
    const url = new URL(`${NOTION_API_BASE}${normalizedPath}`);
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined) {
          url.searchParams.set(key, String(value));
        }
      }
    }
    return url.toString();
  }

  async function executeRequest<T>(
    method: "GET" | "POST" | "PATCH" | "DELETE",
    path: string,
    options: {
      params?: Record<string, NotionParamValue>;
      body?: unknown;
    } = {},
    attempt = 0
  ): Promise<T> {
    try {
      await checkRateLimit(path);

      const token = await getAccessToken();
      const url = buildUrl(path, options.params);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const fetchOptions: RequestInit = {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "Notion-Version": NOTION_API_VERSION,
        },
        signal: controller.signal,
      };

      if ((method === "POST" || method === "PATCH") && options.body) {
        fetchOptions.body = JSON.stringify(options.body);
      }

      const response = await fetch(url, fetchOptions);
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorBody = (await response.json().catch(() => ({}))) as {
          code?: string;
          message?: string;
        };
        throw NotionApiError.fromResponse(response.status, errorBody);
      }

      if (method === "DELETE") {
        state.consecutiveErrors = 0;
        return undefined as T;
      }

      state.consecutiveErrors = 0;
      return (await response.json()) as T;
    } catch (error) {
      return handleRetryableError<T>(error, { method, path, options, attempt });
    }
  }

  interface RequestContext {
    method: "GET" | "POST" | "PATCH" | "DELETE";
    path: string;
    options: { params?: Record<string, NotionParamValue>; body?: unknown };
    attempt: number;
  }

  function shouldRetry(
    error: unknown,
    attempt: number
  ): { retry: boolean; delay?: number } {
    const canRetry = attempt < DEFAULT_RETRY_ATTEMPTS;

    if (error instanceof NotionApiError) {
      if (NotionApiError.isAuthError(error.code)) {
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
    state.lastError = error as Error;

    const { retry, delay } = shouldRetry(error, ctx.attempt);

    if (retry) {
      return await retryWithDelay<T>(ctx, delay);
    }

    if (error instanceof Error && error.name === "AbortError") {
      throw new NotionApiError({
        message: "Request timeout",
        code: "timeout",
      });
    }

    throw error;
  }

  async function retryWithDelay<T>(
    ctx: RequestContext,
    retryAfter?: number
  ): Promise<T> {
    const delay = calculateRetryDelay(ctx.attempt, retryAfter);
    if (debug) {
      logger.debug(
        { path: ctx.path, delay, attempt: ctx.attempt + 1 },
        "Notion retrying request"
      );
    }
    await sleep(delay);
    return await executeRequest<T>(
      ctx.method,
      ctx.path,
      ctx.options,
      ctx.attempt + 1
    );
  }

  async function get<T>(
    path: string,
    params?: Record<string, NotionParamValue>
  ): Promise<T> {
    return await executeRequest<T>("GET", path, { params });
  }

  async function post<T>(path: string, body?: unknown): Promise<T> {
    return await executeRequest<T>("POST", path, { body });
  }

  async function patch<T>(path: string, body?: unknown): Promise<T> {
    return await executeRequest<T>("PATCH", path, { body });
  }

  async function del(path: string): Promise<void> {
    await executeRequest<void>("DELETE", path);
  }

  async function getRateLimitState(): Promise<NotionRateLimitState> {
    const quota = await rateLimiter.getRemainingQuota(
      connectorId,
      "notion",
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
      await get("/users/me");
      return true;
    } catch {
      return false;
    }
  }

  return {
    connectorId,
    get,
    post,
    patch,
    delete: del,
    getRateLimitState,
    healthCheck,
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export { DEFAULT_RATE_LIMITS, DEFAULT_TIMEOUT };
