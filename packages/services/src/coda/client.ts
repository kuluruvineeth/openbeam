import { type RateLimitConfig, rateLimiter } from "@openbeam/redis";
import type { CodaClientConfig } from "@openbeam/types/services/connectors/coda";
import { logger } from "../lib/logger";
import { CodaApiError } from "./types";

const DEFAULT_TIMEOUT = 30_000;
const MAX_RETRY_ATTEMPTS = 3;
const BASE_RETRY_DELAY_MS = 1000;
const MAX_RETRY_DELAY_MS = 30_000;
const BASE_URL = "https://coda.io/apis/v1";

const RATE_LIMITS: RateLimitConfig = {
  requestsPerMinute: 600,
  requestsPerHour: 36_000,
  burstLimit: 100,
};

export type CodaListResponse<T> = {
  items: T[];
  nextPageToken?: string;
  nextPageLink?: string;
};

export type CodaClient = {
  readonly connectorId: string;
  get<T>(path: string, params?: Record<string, string>): Promise<T>;
  post<T>(path: string, body: unknown): Promise<T>;
  put<T>(path: string, body: unknown): Promise<T>;
  del<T>(path: string): Promise<T>;
  listAll<T>(
    path: string,
    params?: Record<string, string>,
    limit?: number
  ): AsyncGenerator<T[], void, undefined>;
  healthCheck(): Promise<boolean>;
};

export function createCodaClient(config: CodaClientConfig): CodaClient {
  const { connectorId, apiKey, timeout = DEFAULT_TIMEOUT } = config;

  async function checkRateLimit(): Promise<void> {
    const { allowed } = await rateLimiter.checkConnectorRateLimit(
      connectorId,
      "coda",
      RATE_LIMITS
    );

    if (!allowed) {
      const quotaAvailable = await rateLimiter.waitForQuota(
        connectorId,
        "coda",
        RATE_LIMITS,
        5
      );

      if (!quotaAvailable) {
        throw new CodaApiError({
          message: "Rate limit exceeded",
          code: "RATE_LIMITED",
          retryable: true,
          retryAfter: 60,
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
          Authorization: `Bearer ${apiKey}`,
          Accept: "application/json",
          "Content-Type": "application/json",
          ...(init?.headers as Record<string, string>),
        },
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }

    if (response.status === 401 || response.status === 403) {
      throw new CodaApiError({
        message: "Invalid API token or insufficient permissions",
        code: response.status === 401 ? "UNAUTHORIZED" : "FORBIDDEN",
        statusCode: response.status,
        retryable: false,
      });
    }

    if (response.status === 429) {
      const retryAfter = Number.parseInt(
        response.headers.get("Retry-After") ?? "10",
        10
      );
      if (attempt < MAX_RETRY_ATTEMPTS) {
        logger.warn(
          { connectorId, url, retryAfter, attempt },
          "Coda API rate limited, retrying"
        );
        await sleep(retryAfter * 1000);
        return request<T>(url, init, attempt + 1);
      }
      throw new CodaApiError({
        message: "Rate limited by Coda",
        code: "RATE_LIMITED",
        statusCode: 429,
        retryable: true,
        retryAfter,
      });
    }

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      const retryable = response.status >= 500;
      if (retryable && attempt < MAX_RETRY_ATTEMPTS) {
        const delayMs = Math.min(
          BASE_RETRY_DELAY_MS * 2 ** attempt +
            Math.random() * BASE_RETRY_DELAY_MS,
          MAX_RETRY_DELAY_MS
        );
        logger.warn(
          { connectorId, url, statusCode: response.status, attempt },
          "Coda API server error, retrying"
        );
        await sleep(delayMs);
        return request<T>(url, init, attempt + 1);
      }
      throw new CodaApiError({
        message: `Coda API ${response.status}: ${body}`,
        code: "API_ERROR",
        statusCode: response.status,
        retryable: false,
      });
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return response.json() as Promise<T>;
  }

  function buildUrl(path: string, params?: Record<string, string>): string {
    const url = new URL(`${BASE_URL}${path}`);
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

  function del<T>(path: string): Promise<T> {
    return request<T>(buildUrl(path), { method: "DELETE" });
  }

  async function* listAll<T>(
    path: string,
    params?: Record<string, string>,
    limit = 100
  ): AsyncGenerator<T[], void, undefined> {
    let pageToken: string | undefined;

    do {
      const queryParams: Record<string, string> = {
        ...params,
        limit: String(limit),
      };
      if (pageToken) {
        queryParams.pageToken = pageToken;
      }

      const response = await get<CodaListResponse<T>>(path, queryParams);
      const items = response.items ?? [];
      if (items.length > 0) {
        yield items;
      }
      pageToken = response.nextPageToken;
    } while (pageToken);
  }

  async function healthCheck(): Promise<boolean> {
    try {
      await get<{ name: string }>("/whoami");
      return true;
    } catch {
      return false;
    }
  }

  return {
    connectorId,
    get,
    post,
    put,
    del,
    listAll,
    healthCheck,
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
