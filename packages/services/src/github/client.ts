import { type RateLimitConfig, rateLimiter } from "@openbeam/redis";
import {
  GITHUB_API_URL,
  GITHUB_GRAPHQL_URL,
  type GitHubClientConfig,
  type GitHubRateLimitState,
} from "@openbeam/types/services/connectors/github";
import { logger } from "../lib/logger";
import { getValidAccessToken } from "../lib/token-refresh";
import { GitHubApiError, GitHubErrorCodes } from "./types";

const DEFAULT_TIMEOUT = 30_000;
const DEFAULT_RETRY_ATTEMPTS = 3;
const BASE_RETRY_DELAY = 1000;
const MAX_RETRY_DELAY = 30_000;

const DEFAULT_RATE_LIMITS: RateLimitConfig = {
  requestsPerMinute: 80,
  requestsPerHour: 4500,
  burstLimit: 30,
};

const LINK_NEXT_REGEX = /<([^>]+)>;\s*rel="next"/;

export interface GitHubClient {
  readonly connectorId: string;
  get<T>(path: string, query?: Record<string, string>): Promise<T>;
  post<T>(path: string, body?: unknown): Promise<T>;
  graphql<T>(query: string, variables?: Record<string, unknown>): Promise<T>;
  getRateLimitState(): Promise<GitHubRateLimitState>;
  healthCheck(): Promise<boolean>;
  parseLinkHeader(linkHeader: string | null): string | undefined;
}

interface ClientState {
  lastRateLimitHit?: number;
  consecutiveErrors: number;
}

export function createGitHubClient(config: GitHubClientConfig): GitHubClient {
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
      "github",
      rateLimitConfig as RateLimitConfig
    );

    if (!allowed) {
      if (debug) {
        logger.debug({ reason }, "GitHub rate limit hit");
      }
      state.lastRateLimitHit = Date.now();

      const quotaAvailable = await rateLimiter.waitForQuota(
        connectorId,
        "github",
        rateLimitConfig as RateLimitConfig,
        5
      );

      if (!quotaAvailable) {
        throw new GitHubApiError({
          message: "Rate limit exceeded",
          code: GitHubErrorCodes.RATE_LIMITED,
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

    if (error instanceof GitHubApiError) {
      if (GitHubApiError.isAuthError(error.code)) {
        return { retry: false };
      }
      return { retry: error.retryable && canRetry, delay: error.retryAfter };
    }

    if (error instanceof Error && error.name === "AbortError") {
      return { retry: canRetry };
    }

    return { retry: false };
  }

  function parseRetryAfterHeader(headers: Headers): number | undefined {
    const retryAfter = headers.get("retry-after");
    if (!retryAfter) {
      return;
    }

    const seconds = Number.parseInt(retryAfter, 10);
    return Number.isNaN(seconds) ? undefined : seconds;
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
      path.startsWith("http") ? path : `${GITHUB_API_URL}${path}`
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
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
        "X-GitHub-Api-Version": "2022-11-28",
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorBody = (await response.json().catch(() => ({}))) as {
        message?: string;
        documentation_url?: string;
      };
      const apiError = GitHubApiError.fromHttpResponse(
        response.status,
        errorBody
      );

      if (GitHubApiError.isRateLimitError(apiError.code)) {
        const retryAfter = parseRetryAfterHeader(response.headers);
        if (retryAfter !== undefined) {
          throw new GitHubApiError({
            message: apiError.message,
            code: apiError.code,
            retryable: true,
            retryAfter,
            status: response.status,
          });
        }

        const resetHeader = response.headers.get("x-ratelimit-reset");
        if (resetHeader) {
          const resetTime = Number.parseInt(resetHeader, 10) * 1000;
          const waitMs = Math.max(0, resetTime - Date.now());
          throw new GitHubApiError({
            message: apiError.message,
            code: apiError.code,
            retryable: true,
            retryAfter: Math.ceil(waitMs / 1000),
            status: response.status,
          });
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
        throw new GitHubApiError({
          message: "Request timeout",
          code: "TIMEOUT",
          retryable: true,
        });
      }

      throw error;
    }
  }

  async function fetchGraphQL<T>(
    query: string,
    variables?: Record<string, unknown>
  ): Promise<T> {
    await checkRateLimit();
    const token = await getAccessToken();

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(GITHUB_GRAPHQL_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query, variables }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const json = (await response.json()) as {
      errors?: Array<{ message: string; type?: string }>;
      data?: T;
    };

    const firstError = json.errors?.[0];
    if (firstError) {
      const isRateLimit = firstError.type === "RATE_LIMITED";
      throw new GitHubApiError({
        message: firstError.message,
        code: isRateLimit ? GitHubErrorCodes.RATE_LIMITED : "GRAPHQL_ERROR",
        retryable: isRateLimit,
      });
    }

    if (!json.data) {
      throw new GitHubApiError({
        message: "No data in GraphQL response",
        code: "EMPTY_RESPONSE",
      });
    }

    return json.data;
  }

  async function executeGraphQL<T>(
    query: string,
    variables?: Record<string, unknown>,
    attempt = 0
  ): Promise<T> {
    try {
      const result = await fetchGraphQL<T>(query, variables);
      state.consecutiveErrors = 0;
      return result;
    } catch (error) {
      state.consecutiveErrors += 1;

      const { retry, delay } = shouldRetryError(error, attempt);
      if (retry) {
        await sleep(calculateRetryDelay(attempt, delay));
        return executeGraphQL<T>(query, variables, attempt + 1);
      }

      throw error;
    }
  }

  function parseLinkHeader(linkHeader: string | null): string | undefined {
    if (!linkHeader) {
      return;
    }

    const match = LINK_NEXT_REGEX.exec(linkHeader);
    return match?.[1];
  }

  async function getRateLimitState(): Promise<GitHubRateLimitState> {
    const quota = await rateLimiter.getRemainingQuota(
      connectorId,
      "github",
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
      await executeRest<{ login: string }>({ method: "GET", path: "/user" });
      return true;
    } catch (error) {
      logger.debug({ error, connectorId }, "GitHub health check failed");
      return false;
    }
  }

  return {
    connectorId,
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
    graphql: executeGraphQL,
    getRateLimitState,
    healthCheck,
    parseLinkHeader,
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export { DEFAULT_RATE_LIMITS, DEFAULT_TIMEOUT };
