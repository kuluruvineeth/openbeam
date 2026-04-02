import { type RateLimitConfig, rateLimiter } from "@openbeam/redis";
import type { LoopioClientConfig } from "@openbeam/types/services/connectors/loopio";
import { logger } from "../lib/logger";
import { LoopioApiError } from "./types";

const DEFAULT_TIMEOUT = 30_000;
const DEFAULT_RETRY_ATTEMPTS = 3;
const BASE_RETRY_DELAY = 1000;
const MAX_RETRY_DELAY = 30_000;
const DEFAULT_BASE_URL = "https://api.loopio.com";

const RATE_LIMITS: RateLimitConfig = {
  requestsPerMinute: 100,
  requestsPerHour: 6000,
  burstLimit: 15,
};

export interface LoopioClient {
  readonly connectorId: string;
  get<T>(path: string, params?: Record<string, string>): Promise<T>;
  post<T>(path: string, body: unknown): Promise<T>;
  put<T>(path: string, body: unknown): Promise<T>;
  patch<T>(path: string, body: unknown): Promise<T>;
  healthCheck(): Promise<boolean>;
}

export function createLoopioClient(config: LoopioClientConfig): LoopioClient {
  const {
    connectorId,
    accessToken,
    baseUrl = DEFAULT_BASE_URL,
    timeout = DEFAULT_TIMEOUT,
  } = config;

  async function checkRateLimit(): Promise<void> {
    const { allowed } = await rateLimiter.checkConnectorRateLimit(
      connectorId,
      "loopio",
      RATE_LIMITS
    );

    if (!allowed) {
      const quotaAvailable = await rateLimiter.waitForQuota(
        connectorId,
        "loopio",
        RATE_LIMITS,
        5
      );

      if (!quotaAvailable) {
        throw new LoopioApiError({
          message: "Rate limit exceeded",
          code: "RATE_LIMITED",
          retryable: true,
          retryAfter: 60,
        });
      }
    }
  }

  async function request<T>(
    method: string,
    path: string,
    options?: {
      params?: Record<string, string>;
      body?: unknown;
      contentType?: string;
    },
    attempt = 0
  ): Promise<T> {
    await checkRateLimit();

    const url = new URL(`${baseUrl}${path}`);
    if (options?.params) {
      for (const [key, value] of Object.entries(options.params)) {
        if (value !== undefined && value !== "") {
          url.searchParams.set(key, value);
        }
      }
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const headers: Record<string, string> = {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
      "Content-Type": options?.contentType ?? "application/json",
    };

    let response: Response;
    try {
      response = await fetch(url.toString(), {
        method,
        headers,
        body: options?.body ? JSON.stringify(options.body) : undefined,
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }

    if (response.status === 429) {
      const retryAfter = Number.parseInt(
        response.headers.get("Retry-After") ?? "60",
        10
      );
      if (attempt < DEFAULT_RETRY_ATTEMPTS) {
        await sleep(Math.min(retryAfter * 1000, MAX_RETRY_DELAY));
        return request<T>(method, path, options, attempt + 1);
      }
      throw new LoopioApiError({
        message: "Rate limited",
        code: "RATE_LIMITED",
        statusCode: 429,
        retryable: true,
        retryAfter,
      });
    }

    if (response.status === 401) {
      throw new LoopioApiError({
        message: "Unauthorized - invalid or expired OAuth token",
        code: "UNAUTHORIZED",
        statusCode: 401,
        retryable: false,
      });
    }

    if (response.status === 403) {
      throw new LoopioApiError({
        message: "Forbidden - insufficient permissions",
        code: "FORBIDDEN",
        statusCode: 403,
        retryable: false,
      });
    }

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      if (response.status >= 500 && attempt < DEFAULT_RETRY_ATTEMPTS) {
        const delay = Math.min(
          BASE_RETRY_DELAY * 2 ** attempt + Math.random() * BASE_RETRY_DELAY,
          MAX_RETRY_DELAY
        );
        logger.warn(
          { connectorId, status: response.status, attempt },
          "Loopio API server error, retrying"
        );
        await sleep(delay);
        return request<T>(method, path, options, attempt + 1);
      }
      throw new LoopioApiError({
        message: `Loopio API ${method} ${response.status}: ${body}`,
        code: "API_ERROR",
        statusCode: response.status,
        retryable: false,
      });
    }

    return response.json() as Promise<T>;
  }

  async function healthCheck(): Promise<boolean> {
    try {
      await request<{ items: unknown[] }>("GET", "/projects", {
        params: { page: "1", pageSize: "1" },
      });
      return true;
    } catch {
      return false;
    }
  }

  return {
    connectorId,
    get: <T>(path: string, params?: Record<string, string>) =>
      request<T>("GET", path, { params }),
    post: <T>(path: string, body: unknown) =>
      request<T>("POST", path, { body }),
    put: <T>(path: string, body: unknown) => request<T>("PUT", path, { body }),
    patch: <T>(path: string, body: unknown) =>
      request<T>("PATCH", path, {
        body,
        contentType: "application/json-patch+json",
      }),
    healthCheck,
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
