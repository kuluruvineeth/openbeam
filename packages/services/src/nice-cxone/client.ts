import { type RateLimitConfig, rateLimiter } from "@openbeam/redis";
import type { NiceCxoneClientConfig } from "@openbeam/types/services/connectors/nice-cxone";
import { logger } from "../lib/logger";
import { NiceCxoneApiError } from "./types";

const DEFAULT_TIMEOUT = 30_000;
const MAX_RETRY_ATTEMPTS = 3;
const BASE_RETRY_DELAY = 1000;
const MAX_RETRY_DELAY = 30_000;

const TRAILING_SLASHES = /\/+$/;

const RATE_LIMITS: RateLimitConfig = {
  requestsPerMinute: 250,
  requestsPerHour: 10_000,
  burstLimit: 30,
};

type CxonePagedResponse = Record<string, unknown>;

export type NiceCxoneClient = {
  readonly connectorId: string;
  readonly baseUrl: string;
  get<T>(path: string, params?: Record<string, string>): Promise<T>;
  post<T>(path: string, body: unknown): Promise<T>;
  listPaged<T>(
    path: string,
    resultKey: string,
    params?: Record<string, string>,
    limit?: number
  ): AsyncGenerator<T[], void, undefined>;
  healthCheck(): Promise<boolean>;
};

export function createNiceCxoneClient(
  config: NiceCxoneClientConfig
): NiceCxoneClient {
  const {
    connectorId,
    accessToken,
    baseUrl: rawBaseUrl,
    timeout = DEFAULT_TIMEOUT,
  } = config;
  const baseUrl = `${rawBaseUrl.replace(TRAILING_SLASHES, "")}/incontactapi/services/v30.0`;

  async function checkRateLimit(): Promise<void> {
    const { allowed } = await rateLimiter.checkConnectorRateLimit(
      connectorId,
      "nice-cxone",
      RATE_LIMITS
    );

    if (!allowed) {
      const quotaAvailable = await rateLimiter.waitForQuota(
        connectorId,
        "nice-cxone",
        RATE_LIMITS,
        5
      );

      if (!quotaAvailable) {
        throw new NiceCxoneApiError({
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
          "NICE CXone API rate limited, retrying"
        );
        await sleep(Math.min(retryAfter * 1000, MAX_RETRY_DELAY));
        return request<T>(url, init, attempt + 1);
      }
      throw new NiceCxoneApiError({
        message: "Rate limited",
        statusCode: 429,
        code: "RATE_LIMITED",
        retryable: true,
        retryAfter,
      });
    }

    if (response.status === 401) {
      throw new NiceCxoneApiError({
        message: "Unauthorized - invalid or expired access token",
        statusCode: 401,
        code: "UNAUTHORIZED",
        retryable: false,
      });
    }

    if (response.status === 403) {
      throw new NiceCxoneApiError({
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
          "NICE CXone API server error, retrying"
        );
        await sleep(delay);
        return request<T>(url, init, attempt + 1);
      }
      throw new NiceCxoneApiError({
        message: `NICE CXone API ${response.status}: ${body}`,
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

  async function* listPaged<T>(
    path: string,
    resultKey: string,
    params?: Record<string, string>,
    limit = 1000
  ): AsyncGenerator<T[], void, undefined> {
    let skip = 0;
    let hasMore = true;

    while (hasMore) {
      const response = await get<CxonePagedResponse>(path, {
        ...params,
        skip: String(skip),
        top: String(limit),
      });

      const items = (response[resultKey] as T[] | undefined) ?? [];
      if (items.length > 0) {
        yield items;
      }
      hasMore = items.length >= limit;
      skip += limit;
    }
  }

  async function healthCheck(): Promise<boolean> {
    try {
      await get("/agents", { top: "1" });
      return true;
    } catch {
      return false;
    }
  }

  return {
    connectorId,
    baseUrl: rawBaseUrl.replace(TRAILING_SLASHES, ""),
    get,
    post,
    listPaged,
    healthCheck,
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
