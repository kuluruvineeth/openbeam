import { type RateLimitConfig, rateLimiter } from "@openbeam/redis";
import type { FreshserviceClientConfig } from "@openbeam/types/services/connectors/freshservice";
import { logger } from "../lib/logger";
import { FreshserviceApiError } from "./types";

const DEFAULT_TIMEOUT = 30_000;
const DEFAULT_RETRY_ATTEMPTS = 3;
const BASE_RETRY_DELAY = 1000;
const MAX_RETRY_DELAY = 30_000;

const RATE_LIMITS: RateLimitConfig = {
  requestsPerMinute: 180,
  requestsPerHour: 10_000,
  burstLimit: 50,
};

export interface FreshserviceClient {
  readonly connectorId: string;
  readonly domain: string;
  get<T>(path: string, params?: Record<string, string>): Promise<T>;
  post<T>(path: string, body: unknown): Promise<T>;
  put<T>(path: string, body: unknown): Promise<T>;
  healthCheck(): Promise<boolean>;
}

function buildBaseUrl(domain: string): string {
  return `https://${domain}.freshservice.com/api/v2`;
}

function encodeBasicAuth(apiKey: string): string {
  const encoded = Buffer.from(`${apiKey}:X`).toString("base64");
  return `Basic ${encoded}`;
}

export function createFreshserviceClient(
  config: FreshserviceClientConfig
): FreshserviceClient {
  const { connectorId, apiKey, domain, timeout = DEFAULT_TIMEOUT } = config;
  const baseUrl = buildBaseUrl(domain);
  const authHeader = encodeBasicAuth(apiKey);

  async function checkRateLimit(): Promise<void> {
    const { allowed } = await rateLimiter.checkConnectorRateLimit(
      connectorId,
      "freshservice",
      RATE_LIMITS
    );

    if (!allowed) {
      const quotaAvailable = await rateLimiter.waitForQuota(
        connectorId,
        "freshservice",
        RATE_LIMITS,
        5
      );

      if (!quotaAvailable) {
        throw new FreshserviceApiError({
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
        url.searchParams.set(key, value);
      }
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    let response: Response;
    try {
      response = await fetch(url.toString(), {
        headers: {
          Authorization: authHeader,
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
      throw new FreshserviceApiError({
        message: "Rate limited",
        code: "RATE_LIMITED",
        retryable: true,
        retryAfter,
      });
    }

    if (response.status === 401) {
      throw new FreshserviceApiError({
        message: "Unauthorized — check your API key",
        code: "UNAUTHORIZED",
        retryable: false,
      });
    }

    if (response.status === 403) {
      throw new FreshserviceApiError({
        message: "Forbidden",
        code: "FORBIDDEN",
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
          "Freshservice API server error, retrying"
        );
        await sleep(delay);
        return fetchJson<T>(path, params, attempt + 1);
      }
      throw new FreshserviceApiError({
        message: `Freshservice API ${response.status}: ${body}`,
        code: "API_ERROR",
        retryable: false,
      });
    }

    return response.json() as Promise<T>;
  }

  async function postJson<T>(path: string, body: unknown): Promise<T> {
    await checkRateLimit();

    const url = `${baseUrl}${path}`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeout),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new FreshserviceApiError({
        message: `Freshservice API POST ${response.status}: ${text}`,
        code: response.status === 429 ? "RATE_LIMITED" : "API_ERROR",
        retryable: response.status >= 500,
      });
    }

    return response.json() as Promise<T>;
  }

  async function putJson<T>(path: string, body: unknown): Promise<T> {
    await checkRateLimit();

    const url = `${baseUrl}${path}`;
    const response = await fetch(url, {
      method: "PUT",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeout),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new FreshserviceApiError({
        message: `Freshservice API PUT ${response.status}: ${text}`,
        code: response.status === 429 ? "RATE_LIMITED" : "API_ERROR",
        retryable: response.status >= 500,
      });
    }

    return response.json() as Promise<T>;
  }

  async function healthCheck(): Promise<boolean> {
    try {
      await fetchJson("/tickets", { per_page: "1" });
      return true;
    } catch {
      return false;
    }
  }

  return {
    connectorId,
    domain,
    get: fetchJson,
    post: postJson,
    put: putJson,
    healthCheck,
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
