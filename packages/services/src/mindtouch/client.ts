import { type RateLimitConfig, rateLimiter } from "@openbeam/redis";
import type { MindtouchClientConfig } from "@openbeam/types/services/connectors/mindtouch";
import { logger } from "../lib/logger";
import { MindtouchApiError } from "./types";

const DEFAULT_TIMEOUT = 30_000;
const DEFAULT_RETRY_ATTEMPTS = 3;
const BASE_RETRY_DELAY = 1000;
const MAX_RETRY_DELAY = 30_000;

const TRAILING_SLASHES = /\/+$/;

const RATE_LIMITS: RateLimitConfig = {
  requestsPerMinute: 120,
  requestsPerHour: 7200,
  burstLimit: 15,
};

export interface MindtouchClient {
  readonly connectorId: string;
  readonly instanceUrl: string;
  get<T>(path: string, params?: Record<string, string>): Promise<T>;
  post<T>(path: string, body: unknown): Promise<T>;
  put<T>(path: string, body: unknown): Promise<T>;
  healthCheck(): Promise<boolean>;
}

export function createMindtouchClient(
  config: MindtouchClientConfig
): MindtouchClient {
  const {
    connectorId,
    apiToken,
    instanceUrl,
    timeout = DEFAULT_TIMEOUT,
  } = config;
  const baseUrl = instanceUrl.replace(TRAILING_SLASHES, "");

  async function checkRateLimit(): Promise<void> {
    const { allowed } = await rateLimiter.checkConnectorRateLimit(
      connectorId,
      "mindtouch",
      RATE_LIMITS
    );

    if (!allowed) {
      const quotaAvailable = await rateLimiter.waitForQuota(
        connectorId,
        "mindtouch",
        RATE_LIMITS,
        5
      );

      if (!quotaAvailable) {
        throw new MindtouchApiError({
          message: "Rate limit exceeded",
          code: "RATE_LIMITED",
          retryable: true,
          retryAfter: 60,
        });
      }
    }
  }

  function handleErrorResponse(
    status: number,
    body: string
  ): MindtouchApiError {
    if (status === 401) {
      return new MindtouchApiError({
        message: "Unauthorized - invalid API token",
        code: "UNAUTHORIZED",
        statusCode: 401,
        retryable: false,
      });
    }

    if (status === 403) {
      return new MindtouchApiError({
        message: "Forbidden - insufficient permissions",
        code: "FORBIDDEN",
        statusCode: 403,
        retryable: false,
      });
    }

    return new MindtouchApiError({
      message: `Mindtouch API ${status}: ${body}`,
      code: "API_ERROR",
      statusCode: status,
      retryable: status >= 500,
    });
  }

  async function fetchJson<T>(
    path: string,
    params?: Record<string, string>,
    attempt = 0
  ): Promise<T> {
    await checkRateLimit();

    const url = new URL(`${baseUrl}/@api/deki${path}`);
    url.searchParams.set("dream.out.format", "json");

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
          Authorization: `Bearer ${apiToken}`,
          Accept: "application/json",
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
      throw new MindtouchApiError({
        message: "Rate limited",
        code: "RATE_LIMITED",
        statusCode: 429,
        retryable: true,
        retryAfter,
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
          "Mindtouch API server error, retrying"
        );
        await sleep(delay);
        return fetchJson<T>(path, params, attempt + 1);
      }
      throw handleErrorResponse(response.status, body);
    }

    return response.json() as Promise<T>;
  }

  async function postJson<T>(path: string, body: unknown): Promise<T> {
    await checkRateLimit();

    const url = new URL(`${baseUrl}/@api/deki${path}`);
    url.searchParams.set("dream.out.format", "json");

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    let response: Response;
    try {
      response = await fetch(url.toString(), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiToken}`,
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
      throw new MindtouchApiError({
        message: `Mindtouch API POST ${response.status}: ${text}`,
        code: response.status === 429 ? "RATE_LIMITED" : "API_ERROR",
        statusCode: response.status,
        retryable: response.status >= 500,
      });
    }

    return response.json() as Promise<T>;
  }

  async function putJson<T>(path: string, body: unknown): Promise<T> {
    await checkRateLimit();

    const url = new URL(`${baseUrl}/@api/deki${path}`);
    url.searchParams.set("dream.out.format", "json");

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    let response: Response;
    try {
      response = await fetch(url.toString(), {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${apiToken}`,
          Accept: "application/json",
          "Content-Type": "text/plain",
        },
        body: typeof body === "string" ? body : JSON.stringify(body),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new MindtouchApiError({
        message: `Mindtouch API PUT ${response.status}: ${text}`,
        code: response.status === 429 ? "RATE_LIMITED" : "API_ERROR",
        statusCode: response.status,
        retryable: response.status >= 500,
      });
    }

    return response.json() as Promise<T>;
  }

  async function healthCheck(): Promise<boolean> {
    try {
      await fetchJson<{ "@id": string }>("/site/settings");
      return true;
    } catch {
      return false;
    }
  }

  return {
    connectorId,
    instanceUrl: baseUrl,
    get: fetchJson,
    post: postJson,
    put: putJson,
    healthCheck,
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
