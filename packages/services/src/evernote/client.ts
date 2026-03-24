import { type RateLimitConfig, rateLimiter } from "@openbeam/redis";
import type { EvernoteClientConfig } from "@openbeam/types/services/connectors/evernote";
import { logger } from "../lib/logger";
import { EvernoteApiError } from "./types";

const DEFAULT_TIMEOUT = 30_000;
const MAX_RETRY_ATTEMPTS = 3;
const BASE_RETRY_DELAY_MS = 1000;
const MAX_RETRY_DELAY_MS = 30_000;
const PRODUCTION_BASE_URL = "https://api.evernote.com";
const SANDBOX_BASE_URL = "https://sandbox.evernote.com/api";

const RATE_LIMITS: RateLimitConfig = {
  requestsPerMinute: 30,
  requestsPerHour: 200,
  burstLimit: 10,
};

export type EvernoteListResponse<T> = {
  items: T[];
  nextOffset?: number;
  totalCount?: number;
};

export type EvernoteClient = {
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

export function createEvernoteClient(
  config: EvernoteClientConfig
): EvernoteClient {
  const {
    connectorId,
    developerToken,
    environment = "production",
    timeout = DEFAULT_TIMEOUT,
  } = config;

  const baseUrl =
    environment === "sandbox" ? SANDBOX_BASE_URL : PRODUCTION_BASE_URL;

  async function checkRateLimit(): Promise<void> {
    const { allowed } = await rateLimiter.checkConnectorRateLimit(
      connectorId,
      "evernote",
      RATE_LIMITS
    );

    if (!allowed) {
      const quotaAvailable = await rateLimiter.waitForQuota(
        connectorId,
        "evernote",
        RATE_LIMITS,
        5
      );

      if (!quotaAvailable) {
        throw new EvernoteApiError({
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
          Authorization: `Bearer ${developerToken}`,
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
      throw new EvernoteApiError({
        message: "Invalid developer token or insufficient permissions",
        code: response.status === 401 ? "UNAUTHORIZED" : "FORBIDDEN",
        statusCode: response.status,
        retryable: false,
      });
    }

    if (response.status === 429) {
      const retryAfter = Number.parseInt(
        response.headers.get("Retry-After") ?? "60",
        10
      );
      if (attempt < MAX_RETRY_ATTEMPTS) {
        logger.warn(
          { connectorId, url, retryAfter, attempt },
          "Evernote API rate limited, retrying"
        );
        await sleep(retryAfter * 1000);
        return request<T>(url, init, attempt + 1);
      }
      throw new EvernoteApiError({
        message: "Rate limited by Evernote",
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
          "Evernote API server error, retrying"
        );
        await sleep(delayMs);
        return request<T>(url, init, attempt + 1);
      }
      throw new EvernoteApiError({
        message: `Evernote API ${response.status}: ${body}`,
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

  function del<T>(path: string): Promise<T> {
    return request<T>(buildUrl(path), { method: "DELETE" });
  }

  async function* listAll<T>(
    path: string,
    params?: Record<string, string>,
    limit = 50
  ): AsyncGenerator<T[], void, undefined> {
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
      const queryParams: Record<string, string> = {
        ...params,
        maxNotes: String(limit),
        offset: String(offset),
      };

      const response = await get<EvernoteListResponse<T>>(path, queryParams);
      const items = response.items ?? [];
      if (items.length > 0) {
        yield items;
      }

      hasMore = items.length >= limit;
      offset += items.length;
    }
  }

  async function healthCheck(): Promise<boolean> {
    try {
      await get<{ username: string }>("/user");
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
