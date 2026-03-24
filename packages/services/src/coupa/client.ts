import { type RateLimitConfig, rateLimiter } from "@openbeam/redis";
import type { CoupaClientConfig } from "@openbeam/types/services/connectors/coupa";
import { logger } from "../lib/logger";
import { CoupaApiError } from "./types";

const DEFAULT_TIMEOUT = 30_000;
const MAX_RETRY_ATTEMPTS = 3;
const BASE_RETRY_DELAY = 1000;
const MAX_RETRY_DELAY = 30_000;

const TRAILING_SLASHES = /\/+$/;

const RATE_LIMITS: RateLimitConfig = {
  requestsPerMinute: 50,
  requestsPerHour: 2000,
  burstLimit: 20,
};

type CoupaListResponse<T> = T[];

export type CoupaClient = {
  readonly connectorId: string;
  readonly instanceUrl: string;
  get<T>(path: string, params?: Record<string, string>): Promise<T>;
  post<T>(path: string, body: unknown): Promise<T>;
  put<T>(path: string, body: unknown): Promise<T>;
  list<T>(
    path: string,
    params?: Record<string, string>,
    limit?: number
  ): Promise<CoupaListResponse<T>>;
  listAll<T>(
    path: string,
    params?: Record<string, string>,
    limit?: number
  ): AsyncGenerator<T[], void, undefined>;
  healthCheck(): Promise<boolean>;
};

export function createCoupaClient(config: CoupaClientConfig): CoupaClient {
  const {
    connectorId,
    accessToken,
    instanceUrl,
    timeout = DEFAULT_TIMEOUT,
  } = config;
  const baseUrl = `${instanceUrl.replace(TRAILING_SLASHES, "")}/api`;

  async function checkRateLimit(): Promise<void> {
    const { allowed } = await rateLimiter.checkConnectorRateLimit(
      connectorId,
      "coupa",
      RATE_LIMITS
    );

    if (!allowed) {
      const quotaAvailable = await rateLimiter.waitForQuota(
        connectorId,
        "coupa",
        RATE_LIMITS,
        5
      );

      if (!quotaAvailable) {
        throw new CoupaApiError({
          message: "Rate limit exceeded",
          code: "RATE_LIMITED",
          retryable: true,
          retryAfter: 20,
        });
      }
    }
  }

  async function request<T>(
    url: string,
    init?: RequestInit,
    attempt = 0
  ): Promise<T> {
    await checkRateLimit();

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    let response: Response;
    try {
      response = await fetch(url, {
        ...init,
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
          "Content-Type": "application/json",
          ...(init?.headers as Record<string, string>),
        },
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }

    if (response.status === 429) {
      const retryAfter = Number.parseInt(
        response.headers.get("Retry-After") ?? "20",
        10
      );
      if (attempt < MAX_RETRY_ATTEMPTS) {
        logger.warn(
          { connectorId, url, retryAfter, attempt },
          "Coupa API rate limited, retrying"
        );
        await sleep(Math.min(retryAfter * 1000, MAX_RETRY_DELAY));
        return request<T>(url, init, attempt + 1);
      }
      throw new CoupaApiError({
        message: "Rate limited",
        statusCode: 429,
        code: "RATE_LIMITED",
        retryable: true,
        retryAfter,
      });
    }

    if (response.status === 401) {
      throw new CoupaApiError({
        message: "Unauthorized - invalid or expired access token",
        statusCode: 401,
        code: "UNAUTHORIZED",
        retryable: false,
      });
    }

    if (response.status === 403) {
      throw new CoupaApiError({
        message: "Forbidden - insufficient permissions",
        statusCode: 403,
        code: "FORBIDDEN",
        retryable: false,
      });
    }

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      if (response.status >= 500 && attempt < MAX_RETRY_ATTEMPTS) {
        const delay = Math.min(
          BASE_RETRY_DELAY * 2 ** attempt + Math.random() * BASE_RETRY_DELAY,
          MAX_RETRY_DELAY
        );
        logger.warn(
          { connectorId, status: response.status, attempt },
          "Coupa API server error, retrying"
        );
        await sleep(delay);
        return request<T>(url, init, attempt + 1);
      }
      throw new CoupaApiError({
        message: `Coupa API ${response.status}: ${body}`,
        code: "API_ERROR",
        statusCode: response.status,
        retryable: false,
      });
    }

    return response.json() as Promise<T>;
  }

  function buildUrl(path: string, params?: Record<string, string>): string {
    const url = new URL(`${baseUrl}${path}`);
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== "") {
          url.searchParams.set(key, value);
        }
      }
    }
    return url.toString();
  }

  function get<T>(path: string, params?: Record<string, string>): Promise<T> {
    return request<T>(buildUrl(path, params));
  }

  function post<T>(path: string, body: unknown): Promise<T> {
    return request<T>(buildUrl(path), {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  function put<T>(path: string, body: unknown): Promise<T> {
    return request<T>(buildUrl(path), {
      method: "PUT",
      body: JSON.stringify(body),
    });
  }

  function list<T>(
    path: string,
    params?: Record<string, string>,
    limit = 50
  ): Promise<CoupaListResponse<T>> {
    const mergedParams = { ...params, limit: String(limit) };
    return get<CoupaListResponse<T>>(path, mergedParams);
  }

  async function* listAll<T>(
    path: string,
    params?: Record<string, string>,
    limit = 50
  ): AsyncGenerator<T[], void, undefined> {
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
      const response = await list<T>(
        path,
        { ...params, offset: String(offset) },
        limit
      );
      if (response.length > 0) {
        yield response;
      }
      hasMore = response.length >= limit;
      offset += limit;
    }
  }

  async function healthCheck(): Promise<boolean> {
    try {
      await get("/purchase_orders", { limit: "1" });
      return true;
    } catch {
      return false;
    }
  }

  return {
    connectorId,
    instanceUrl,
    get,
    post,
    put,
    list,
    listAll,
    healthCheck,
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
