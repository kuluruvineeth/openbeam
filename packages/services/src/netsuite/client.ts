import { buildOAuth1Header } from "@openbeam/integrations";
import { type RateLimitConfig, rateLimiter } from "@openbeam/redis";
import type { NetsuiteClientConfig } from "@openbeam/types/services/connectors/netsuite";
import { logger } from "../lib/logger";
import { NetsuiteApiError } from "./types";

const DEFAULT_TIMEOUT = 30_000;
const MAX_RETRY_ATTEMPTS = 3;
const BASE_RETRY_DELAY = 1000;
const MAX_RETRY_DELAY = 30_000;

const RATE_LIMITS: RateLimitConfig = {
  requestsPerMinute: 40,
  requestsPerHour: 1500,
  burstLimit: 10,
};

type NetsuiteListResponse<T> = {
  items: T[];
  totalResults?: number;
  count?: number;
  hasMore?: boolean;
  offset?: number;
};

export type NetsuiteClient = {
  readonly connectorId: string;
  readonly accountId: string;
  get<T>(path: string, params?: Record<string, string>): Promise<T>;
  post<T>(path: string, body: unknown): Promise<T>;
  patch<T>(path: string, body: unknown): Promise<T>;
  list<T>(
    path: string,
    params?: Record<string, string>,
    limit?: number
  ): Promise<NetsuiteListResponse<T>>;
  listAll<T>(
    path: string,
    params?: Record<string, string>,
    limit?: number
  ): AsyncGenerator<T[], void, undefined>;
  healthCheck(): Promise<boolean>;
};

export function createNetsuiteClient(
  config: NetsuiteClientConfig
): NetsuiteClient {
  const {
    connectorId,
    accountId,
    consumerKey,
    consumerSecret,
    tokenKey,
    tokenSecret,
    timeout = DEFAULT_TIMEOUT,
  } = config;
  const accountSlug = accountId.toLowerCase().replace(/_/g, "-");
  const baseUrl = `https://${accountSlug}.suitetalk.api.netsuite.com/services/rest/record/v1`;

  async function checkRateLimit(): Promise<void> {
    const { allowed } = await rateLimiter.checkConnectorRateLimit(
      connectorId,
      "netsuite",
      RATE_LIMITS
    );

    if (!allowed) {
      const quotaAvailable = await rateLimiter.waitForQuota(
        connectorId,
        "netsuite",
        RATE_LIMITS,
        5
      );

      if (!quotaAvailable) {
        throw new NetsuiteApiError({
          message: "Rate limit exceeded",
          code: "RATE_LIMITED",
          retryable: true,
          retryAfter: 20,
        });
      }
    }
  }

  function buildAuthHeader(method: string, url: string): string {
    return buildOAuth1Header({
      method,
      url,
      consumerKey,
      consumerSecret,
      tokenKey,
      tokenSecret,
      accountId,
    });
  }

  async function request<T>(
    url: string,
    init?: RequestInit,
    attempt = 0
  ): Promise<T> {
    await checkRateLimit();

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const method = init?.method ?? "GET";
    const urlObj = new URL(url);
    const baseUrlForSig = `${urlObj.origin}${urlObj.pathname}`;

    let response: Response;
    try {
      response = await fetch(url, {
        ...init,
        headers: {
          Authorization: buildAuthHeader(method, baseUrlForSig),
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
          "NetSuite API rate limited, retrying"
        );
        await sleep(Math.min(retryAfter * 1000, MAX_RETRY_DELAY));
        return request<T>(url, init, attempt + 1);
      }
      throw new NetsuiteApiError({
        message: "Rate limited",
        statusCode: 429,
        code: "RATE_LIMITED",
        retryable: true,
        retryAfter,
      });
    }

    if (response.status === 401) {
      throw new NetsuiteApiError({
        message: "Unauthorized - invalid or expired credentials",
        statusCode: 401,
        code: "UNAUTHORIZED",
        retryable: false,
      });
    }

    if (response.status === 403) {
      throw new NetsuiteApiError({
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
          "NetSuite API server error, retrying"
        );
        await sleep(delay);
        return request<T>(url, init, attempt + 1);
      }
      throw new NetsuiteApiError({
        message: `NetSuite API ${response.status}: ${body}`,
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

  function patch<T>(path: string, body: unknown): Promise<T> {
    return request<T>(buildUrl(path), {
      method: "PATCH",
      body: JSON.stringify(body),
    });
  }

  function list<T>(
    path: string,
    params?: Record<string, string>,
    limit = 50
  ): Promise<NetsuiteListResponse<T>> {
    const mergedParams = { ...params, limit: String(limit) };
    return get<NetsuiteListResponse<T>>(path, mergedParams);
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
      const items = response.items ?? [];
      if (items.length > 0) {
        yield items;
      }
      hasMore = response.hasMore ?? items.length >= limit;
      offset += limit;
    }
  }

  async function healthCheck(): Promise<boolean> {
    try {
      await get("/customer", { limit: "1" });
      return true;
    } catch {
      return false;
    }
  }

  return {
    connectorId,
    accountId,
    get,
    post,
    patch,
    list,
    listAll,
    healthCheck,
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
