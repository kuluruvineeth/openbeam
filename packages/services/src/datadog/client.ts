import { type RateLimitConfig, rateLimiter } from "@openbeam/redis";
import {
  DATADOG_SITES,
  type DatadogClientConfig,
  type DatadogSite,
} from "@openbeam/types/services/connectors/datadog";
import { logger } from "../lib/logger";
import { DatadogApiError } from "./types";

const DEFAULT_TIMEOUT = 30_000;
const DEFAULT_RETRY_ATTEMPTS = 3;
const BASE_RETRY_DELAY = 1000;
const MAX_RETRY_DELAY = 30_000;

const RATE_LIMITS: RateLimitConfig = {
  requestsPerMinute: 300,
  requestsPerHour: 18_000,
  burstLimit: 30,
};

export interface DatadogClient {
  readonly connectorId: string;
  get<T>(path: string, params?: Record<string, string>): Promise<T>;
  post<T>(path: string, body: unknown): Promise<T>;
  put<T>(path: string, body: unknown): Promise<T>;
  healthCheck(): Promise<boolean>;
}

export function createDatadogClient(
  config: DatadogClientConfig
): DatadogClient {
  const {
    connectorId,
    apiKey,
    appKey,
    site = "us1",
    timeout = DEFAULT_TIMEOUT,
  } = config;
  const baseUrl = DATADOG_SITES[site as DatadogSite] ?? DATADOG_SITES.us1;

  function buildHeaders(): Record<string, string> {
    return {
      "DD-API-KEY": apiKey,
      "DD-APPLICATION-KEY": appKey,
      Accept: "application/json",
      "Content-Type": "application/json",
    };
  }

  async function checkRateLimit(): Promise<void> {
    const { allowed } = await rateLimiter.checkConnectorRateLimit(
      connectorId,
      "datadog",
      RATE_LIMITS
    );

    if (!allowed) {
      const quotaAvailable = await rateLimiter.waitForQuota(
        connectorId,
        "datadog",
        RATE_LIMITS,
        5
      );

      if (!quotaAvailable) {
        throw new DatadogApiError({
          message: "Rate limit exceeded",
          code: "RATE_LIMITED",
          retryable: true,
          retryAfter: 60,
        });
      }
    }
  }

  async function handleErrorResponse(
    response: Response,
    method: string,
    path: string,
    attempt: number
  ): Promise<never | undefined> {
    if (response.status === 429) {
      const retryAfter = Number.parseInt(
        response.headers.get("X-RateLimit-Reset") ?? "60",
        10
      );
      if (attempt < DEFAULT_RETRY_ATTEMPTS) {
        await sleep(Math.min(retryAfter * 1000, MAX_RETRY_DELAY));
        return;
      }
      throw new DatadogApiError({
        message: "Rate limited",
        code: "RATE_LIMITED",
        statusCode: 429,
        retryable: true,
        retryAfter,
      });
    }

    if (response.status === 401) {
      throw new DatadogApiError({
        message: "Unauthorized - invalid API key or Application key",
        code: "UNAUTHORIZED",
        statusCode: 401,
        retryable: false,
      });
    }

    if (response.status === 403) {
      throw new DatadogApiError({
        message: "Forbidden - insufficient permissions",
        code: "FORBIDDEN",
        statusCode: 403,
        retryable: false,
      });
    }

    const body = await response.text().catch(() => "");
    if (response.status >= 500 && attempt < DEFAULT_RETRY_ATTEMPTS) {
      const delay = Math.min(
        BASE_RETRY_DELAY * 2 ** attempt + Math.random() * BASE_RETRY_DELAY,
        MAX_RETRY_DELAY
      );
      logger.warn(
        { connectorId, status: response.status, attempt },
        "Datadog API server error, retrying"
      );
      await sleep(delay);
      return;
    }

    throw new DatadogApiError({
      message: `Datadog API ${method} ${path} ${response.status}: ${body}`,
      code: "API_ERROR",
      statusCode: response.status,
      retryable: false,
    });
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
        headers: buildHeaders(),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      const shouldRetry = await handleErrorResponse(
        response,
        "GET",
        path,
        attempt
      );
      if (shouldRetry === undefined) {
        return fetchJson<T>(path, params, attempt + 1);
      }
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
        headers: buildHeaders(),
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new DatadogApiError({
        message: `Datadog API POST ${path} ${response.status}: ${text}`,
        code: response.status === 429 ? "RATE_LIMITED" : "API_ERROR",
        statusCode: response.status,
        retryable: response.status >= 500,
      });
    }

    return response.json() as Promise<T>;
  }

  async function putJson<T>(path: string, body: unknown): Promise<T> {
    await checkRateLimit();

    const url = `${baseUrl}${path}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    let response: Response;
    try {
      response = await fetch(url, {
        method: "PUT",
        headers: buildHeaders(),
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new DatadogApiError({
        message: `Datadog API PUT ${path} ${response.status}: ${text}`,
        code: response.status === 429 ? "RATE_LIMITED" : "API_ERROR",
        statusCode: response.status,
        retryable: response.status >= 500,
      });
    }

    return response.json() as Promise<T>;
  }

  async function healthCheck(): Promise<boolean> {
    try {
      await fetchJson("/api/v1/validate");
      return true;
    } catch (error) {
      if (
        error instanceof DatadogApiError &&
        DatadogApiError.isAuthError(error.code)
      ) {
        return false;
      }
      return false;
    }
  }

  return {
    connectorId,
    get: fetchJson,
    post: postJson,
    put: putJson,
    healthCheck,
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
