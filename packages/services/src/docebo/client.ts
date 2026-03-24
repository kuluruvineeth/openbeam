import { type RateLimitConfig, rateLimiter } from "@openbeam/redis";
import type { DoceboClientConfig } from "@openbeam/types/services/connectors/docebo";
import { logger } from "../lib/logger";
import { DoceboApiError } from "./types";

const DEFAULT_TIMEOUT = 30_000;
const MAX_RETRY_ATTEMPTS = 3;
const BASE_RETRY_DELAY = 1000;
const MAX_RETRY_DELAY = 30_000;
const DEFAULT_PAGE_SIZE = 200;

const TRAILING_SLASHES = /\/+$/;

const RATE_LIMITS: RateLimitConfig = {
  requestsPerMinute: 500,
  requestsPerHour: 10_000,
  burstLimit: 50,
};

export type DoceboPagedResponse<T> = {
  data: {
    items: T[];
    count: number;
    has_more_data: boolean;
    current_page: number;
    current_page_size: number;
    total_page_count: number;
    total_count: number;
  };
};

export type DoceboClient = {
  readonly connectorId: string;
  readonly instanceUrl: string;
  get<T>(path: string, params?: Record<string, string>): Promise<T>;
  post<T>(path: string, body: unknown): Promise<T>;
  put<T>(path: string, body: unknown): Promise<T>;
  listPaged<T>(
    path: string,
    params?: Record<string, string>,
    pageSize?: number
  ): AsyncGenerator<T[], void, undefined>;
  healthCheck(): Promise<boolean>;
};

export function createDoceboClient(config: DoceboClientConfig): DoceboClient {
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
      "docebo",
      RATE_LIMITS
    );

    if (!allowed) {
      const quotaAvailable = await rateLimiter.waitForQuota(
        connectorId,
        "docebo",
        RATE_LIMITS,
        5
      );

      if (!quotaAvailable) {
        throw new DoceboApiError({
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
          "Docebo API rate limited, retrying"
        );
        await sleep(Math.min(retryAfter * 1000, MAX_RETRY_DELAY));
        return request<T>(url, init, attempt + 1);
      }
      throw new DoceboApiError({
        message: "Rate limited",
        statusCode: 429,
        code: "RATE_LIMITED",
        retryable: true,
        retryAfter,
      });
    }

    if (response.status === 401) {
      throw new DoceboApiError({
        message: "Unauthorized - invalid or expired access token",
        statusCode: 401,
        code: "UNAUTHORIZED",
        retryable: false,
      });
    }

    if (response.status === 403) {
      throw new DoceboApiError({
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
          "Docebo API server error, retrying"
        );
        await sleep(delay);
        return request<T>(url, init, attempt + 1);
      }
      throw new DoceboApiError({
        message: `Docebo API ${response.status}: ${body}`,
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

  async function* listPaged<T>(
    path: string,
    params?: Record<string, string>,
    pageSize = DEFAULT_PAGE_SIZE
  ): AsyncGenerator<T[], void, undefined> {
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const response = await get<DoceboPagedResponse<T>>(path, {
        ...params,
        page: String(page),
        page_size: String(pageSize),
      });

      const items = response.data?.items ?? [];
      if (items.length > 0) {
        yield items;
      }

      hasMore = response.data?.has_more_data ?? false;
      page += 1;
    }
  }

  async function healthCheck(): Promise<boolean> {
    try {
      await get("/learn/v1/courses", { page_size: "1", page: "1" });
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
    listPaged,
    healthCheck,
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
