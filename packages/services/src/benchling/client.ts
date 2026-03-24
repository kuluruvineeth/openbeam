import { type RateLimitConfig, rateLimiter } from "@openbeam/redis";
import type { BenchlingClientConfig } from "@openbeam/types/services/connectors/benchling";
import { logger } from "../lib/logger";
import { BenchlingApiError } from "./types";

const DEFAULT_TIMEOUT = 30_000;
const DEFAULT_RETRY_ATTEMPTS = 3;
const BASE_RETRY_DELAY = 1000;
const MAX_RETRY_DELAY = 30_000;

const RATE_LIMITS: RateLimitConfig = {
  requestsPerMinute: 1000,
  requestsPerHour: 30_000,
  burstLimit: 50,
};

export interface BenchlingClient {
  readonly connectorId: string;
  readonly tenant: string;
  get<T>(path: string, params?: Record<string, string>): Promise<T>;
  post<T>(path: string, body: unknown): Promise<T>;
  patch<T>(path: string, body: unknown): Promise<T>;
  healthCheck(): Promise<boolean>;
}

export function createBenchlingClient(
  config: BenchlingClientConfig
): BenchlingClient {
  const { connectorId, apiKey, tenant, timeout = DEFAULT_TIMEOUT } = config;
  const baseUrl = `https://${tenant}.benchling.com/api/v2`;
  const basicAuth = btoa(`${apiKey}:`);

  async function checkRateLimit(): Promise<void> {
    const { allowed } = await rateLimiter.checkConnectorRateLimit(
      connectorId,
      "benchling",
      RATE_LIMITS
    );

    if (!allowed) {
      const quotaAvailable = await rateLimiter.waitForQuota(
        connectorId,
        "benchling",
        RATE_LIMITS,
        5
      );

      if (!quotaAvailable) {
        throw new BenchlingApiError({
          message: "Rate limit exceeded",
          code: "RATE_LIMITED",
          retryable: true,
          retryAfter: 60,
        });
      }
    }
  }

  async function fetchJson<T>(
    path: string,
    params?: Record<string, string>,
    attempt = 0
  ): Promise<T> {
    await checkRateLimit();

    const url = new URL(`${baseUrl}${path}`);
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== "") {
          url.searchParams.set(key, value);
        }
      }
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    let response: Response;
    try {
      response = await fetch(url.toString(), {
        headers: {
          Authorization: `Basic ${basicAuth}`,
          Accept: "application/json",
          "Content-Type": "application/json",
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
        return fetchJson<T>(path, params, attempt + 1);
      }
      throw new BenchlingApiError({
        message: "Rate limited",
        code: "RATE_LIMITED",
        statusCode: 429,
        retryable: true,
        retryAfter,
      });
    }

    if (response.status === 401) {
      throw new BenchlingApiError({
        message: "Unauthorized - invalid API key",
        code: "UNAUTHORIZED",
        statusCode: 401,
        retryable: false,
      });
    }

    if (response.status === 403) {
      throw new BenchlingApiError({
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
          "Benchling API server error, retrying"
        );
        await sleep(delay);
        return fetchJson<T>(path, params, attempt + 1);
      }
      throw new BenchlingApiError({
        message: `Benchling API ${response.status}: ${body}`,
        code: "API_ERROR",
        statusCode: response.status,
        retryable: false,
      });
    }

    return response.json() as Promise<T>;
  }

  async function postJson<T>(path: string, body: unknown): Promise<T> {
    await checkRateLimit();

    const url = `${baseUrl}${path}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    let response: Response;
    try {
      response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Basic ${basicAuth}`,
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new BenchlingApiError({
        message: `Benchling API POST ${response.status}: ${text}`,
        code: response.status === 429 ? "RATE_LIMITED" : "API_ERROR",
        statusCode: response.status,
        retryable: response.status >= 500,
      });
    }

    return response.json() as Promise<T>;
  }

  async function patchJson<T>(path: string, body: unknown): Promise<T> {
    await checkRateLimit();

    const url = `${baseUrl}${path}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    let response: Response;
    try {
      response = await fetch(url, {
        method: "PATCH",
        headers: {
          Authorization: `Basic ${basicAuth}`,
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new BenchlingApiError({
        message: `Benchling API PATCH ${response.status}: ${text}`,
        code: response.status === 429 ? "RATE_LIMITED" : "API_ERROR",
        statusCode: response.status,
        retryable: response.status >= 500,
      });
    }

    return response.json() as Promise<T>;
  }

  async function healthCheck(): Promise<boolean> {
    try {
      await fetchJson<{ projects: unknown[] }>("/projects", {
        pageSize: "1",
      });
      return true;
    } catch {
      return false;
    }
  }

  return {
    connectorId,
    tenant,
    get: fetchJson,
    post: postJson,
    patch: patchJson,
    healthCheck,
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
