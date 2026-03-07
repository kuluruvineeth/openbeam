import { type RateLimitConfig, rateLimiter } from "@openbeam/redis";
import type { OmniverseClientConfig } from "@openbeam/types/services/connectors/omniverse";
import { logger } from "../lib/logger";
import { OmniverseApiError } from "./types";

const DEFAULT_TIMEOUT = 30_000;
const DEFAULT_RETRY_ATTEMPTS = 3;
const BASE_RETRY_DELAY = 1000;
const MAX_RETRY_DELAY = 30_000;

const RATE_LIMITS: RateLimitConfig = {
  requestsPerMinute: 60,
  requestsPerHour: 2000,
  burstLimit: 15,
};

const TRAILING_SLASH_RE = /\/$/;

export interface OmniverseClient {
  readonly connectorId: string;
  get<T>(path: string, params?: Record<string, string>): Promise<T>;
  post<T>(path: string, body?: unknown): Promise<T>;
  healthCheck(): Promise<boolean>;
}

export function createOmniverseClient(
  config: OmniverseClientConfig
): OmniverseClient {
  const {
    connectorId,
    nucleusUrl,
    apiToken,
    timeout = DEFAULT_TIMEOUT,
  } = config;

  const baseUrl = nucleusUrl.replace(TRAILING_SLASH_RE, "");

  async function checkRateLimit(): Promise<void> {
    const { allowed } = await rateLimiter.checkConnectorRateLimit(
      connectorId,
      "omniverse",
      RATE_LIMITS
    );

    if (!allowed) {
      const quotaAvailable = await rateLimiter.waitForQuota(
        connectorId,
        "omniverse",
        RATE_LIMITS,
        5
      );

      if (!quotaAvailable) {
        throw new OmniverseApiError({
          message: "Rate limit exceeded",
          code: "RATE_LIMITED",
          retryable: true,
          retryAfter: 60,
        });
      }
    }
  }

  async function request<T>(
    path: string,
    options: RequestInit,
    attempt = 0
  ): Promise<T> {
    await checkRateLimit();

    const url = `${baseUrl}${path}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    let response: Response;
    try {
      response = await fetch(url, {
        ...options,
        headers: {
          Authorization: `Bearer ${apiToken}`,
          "Content-Type": "application/json",
          ...options.headers,
        },
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
        return request<T>(path, options, attempt + 1);
      }
      throw new OmniverseApiError({
        message: "Rate limited",
        code: "RATE_LIMITED",
        retryable: true,
        retryAfter,
      });
    }

    if (response.status === 401 || response.status === 403) {
      throw new OmniverseApiError({
        message: `Unauthorized: ${response.status}`,
        code: response.status === 401 ? "UNAUTHORIZED" : "FORBIDDEN",
        retryable: false,
      });
    }

    if (!response.ok) {
      const body = await response.text();
      if (response.status >= 500 && attempt < DEFAULT_RETRY_ATTEMPTS) {
        const delay = Math.min(
          BASE_RETRY_DELAY * 2 ** attempt,
          MAX_RETRY_DELAY
        );
        logger.warn(
          { status: response.status, attempt, delay },
          "Omniverse API server error, retrying"
        );
        await sleep(delay);
        return request<T>(path, options, attempt + 1);
      }
      throw new OmniverseApiError({
        message: `Omniverse API ${response.status}: ${body}`,
        code: "API_ERROR",
        retryable: false,
      });
    }

    return response.json() as Promise<T>;
  }

  function get<T>(path: string, params?: Record<string, string>): Promise<T> {
    const url = new URL(`${baseUrl}${path}`);
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        url.searchParams.set(key, value);
      }
    }
    return request<T>(url.pathname + url.search, { method: "GET" });
  }

  function post<T>(path: string, body?: unknown): Promise<T> {
    return request<T>(path, {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async function healthCheck(): Promise<boolean> {
    try {
      await get("/omni/api/version");
      return true;
    } catch {
      return false;
    }
  }

  return {
    connectorId,
    get,
    post,
    healthCheck,
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
