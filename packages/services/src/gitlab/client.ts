import { type RateLimitConfig, rateLimiter } from "@openbeam/redis";
import {
  GITLAB_DEFAULT_URL,
  type GitLabClientConfig,
} from "@openbeam/types/services/connectors/gitlab";
import { logger } from "../lib/logger";
import { getValidAccessToken } from "../lib/token-refresh";
import { GitLabApiError, GitLabErrorCodes } from "./types";

const DEFAULT_TIMEOUT = 30_000;
const DEFAULT_RETRY_ATTEMPTS = 3;
const BASE_RETRY_DELAY = 1000;
const MAX_RETRY_DELAY = 30_000;
const DEFAULT_PER_PAGE = 100;
const TRAILING_SLASHES = /\/+$/;

const DEFAULT_RATE_LIMITS: RateLimitConfig = {
  requestsPerMinute: 120,
  requestsPerHour: 3600,
  burstLimit: 30,
};

export interface GitLabClient {
  readonly connectorId: string;
  readonly baseUrl: string;
  get<T>(path: string, query?: Record<string, string>): Promise<T>;
  post<T>(path: string, body?: unknown): Promise<T>;
  put<T>(path: string, body?: unknown): Promise<T>;
  paginate<T>(
    path: string,
    query?: Record<string, string>
  ): AsyncGenerator<T[], void, undefined>;
  healthCheck(): Promise<boolean>;
}

interface ClientState {
  lastRateLimitHit?: number;
  consecutiveErrors: number;
}

export function createGitLabClient(config: GitLabClientConfig): GitLabClient {
  const {
    connectorId,
    accessToken: providedToken,
    instanceUrl,
    timeout = DEFAULT_TIMEOUT,
    debug = false,
  } = config;

  const baseUrl = (instanceUrl || GITLAB_DEFAULT_URL).replace(
    TRAILING_SLASHES,
    ""
  );
  const apiBaseUrl = `${baseUrl}/api/v4`;
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
      "gitlab",
      DEFAULT_RATE_LIMITS
    );

    if (!allowed) {
      if (debug) {
        logger.debug({ reason }, "GitLab rate limit hit");
      }
      state.lastRateLimitHit = Date.now();

      const quotaAvailable = await rateLimiter.waitForQuota(
        connectorId,
        "gitlab",
        DEFAULT_RATE_LIMITS,
        5
      );

      if (!quotaAvailable) {
        throw new GitLabApiError({
          message: "Rate limit exceeded",
          code: GitLabErrorCodes.RATE_LIMITED,
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

    if (error instanceof GitLabApiError) {
      if (GitLabApiError.isAuthError(error.code)) {
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
    path: string,
    query?: Record<string, string>,
    body?: unknown
  ): Promise<{ data: T; headers: Headers }> {
    await checkRateLimit();
    const token = await getAccessToken();

    const url = new URL(
      path.startsWith("http") ? path : `${apiBaseUrl}${path}`
    );
    if (query) {
      for (const [key, value] of Object.entries(query)) {
        url.searchParams.set(key, value);
      }
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(url.toString(), {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorBody = (await response.json().catch(() => ({}))) as {
        message?: string;
        error?: string;
      };
      const apiError = GitLabApiError.fromHttpResponse(
        response.status,
        errorBody
      );

      if (GitLabApiError.isRateLimitError(apiError.code)) {
        const retryAfter = response.headers.get("retry-after");
        if (retryAfter) {
          const seconds = Number.parseInt(retryAfter, 10);
          if (!Number.isNaN(seconds)) {
            throw new GitLabApiError({
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

    const data = (await response.json()) as T;
    return { data, headers: response.headers };
  }

  interface ExecuteRestRequest {
    method: string;
    path: string;
    query?: Record<string, string>;
    body?: unknown;
    attempt?: number;
  }

  async function executeRest<T>(
    request: ExecuteRestRequest
  ): Promise<{ data: T; headers: Headers }> {
    const { method, path, query, body, attempt = 0 } = request;

    try {
      const result = await fetchRest<T>(method, path, query, body);
      state.consecutiveErrors = 0;
      return result;
    } catch (error) {
      state.consecutiveErrors += 1;

      const { retry, delay } = shouldRetryError(error, attempt);
      if (retry) {
        await sleep(calculateRetryDelay(attempt, delay));
        return executeRest<T>({
          method,
          path,
          query,
          body,
          attempt: attempt + 1,
        });
      }

      if (error instanceof Error && error.name === "AbortError") {
        throw new GitLabApiError({
          message: "Request timeout",
          code: "TIMEOUT",
          retryable: true,
        });
      }

      throw error;
    }
  }

  async function* paginate<T>(
    path: string,
    query?: Record<string, string>
  ): AsyncGenerator<T[], void, undefined> {
    let page = 1;
    const perPage = query?.per_page ?? String(DEFAULT_PER_PAGE);

    while (true) {
      const { data, headers } = await executeRest<T[]>({
        method: "GET",
        path,
        query: {
          ...query,
          page: String(page),
          per_page: perPage,
        },
      });

      if (data.length > 0) {
        yield data;
      }

      const nextPage = headers.get("x-next-page");
      if (!nextPage || data.length === 0) {
        break;
      }

      page = Number.parseInt(nextPage, 10);
      if (Number.isNaN(page)) {
        break;
      }
    }
  }

  async function healthCheck(): Promise<boolean> {
    try {
      await executeRest<{ username: string }>({
        method: "GET",
        path: "/user",
      });
      return true;
    } catch (error) {
      logger.debug({ error, connectorId }, "GitLab health check failed");
      return false;
    }
  }

  return {
    connectorId,
    baseUrl,
    async get<T>(path: string, query?: Record<string, string>): Promise<T> {
      const { data } = await executeRest<T>({
        method: "GET",
        path,
        query,
      });
      return data;
    },
    async post<T>(path: string, body?: unknown): Promise<T> {
      const { data } = await executeRest<T>({
        method: "POST",
        path,
        body,
      });
      return data;
    },
    async put<T>(path: string, body?: unknown): Promise<T> {
      const { data } = await executeRest<T>({
        method: "PUT",
        path,
        body,
      });
      return data;
    },
    paginate,
    healthCheck,
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export { DEFAULT_RATE_LIMITS, DEFAULT_TIMEOUT };
