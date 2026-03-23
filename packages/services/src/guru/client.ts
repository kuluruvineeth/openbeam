import { type RateLimitConfig, rateLimiter } from "@openbeam/redis";
import {
  GURU_API_BASE,
  type GuruClientConfig,
} from "@openbeam/types/services/connectors/guru";
import { logger } from "../lib/logger";
import { GuruApiError } from "./types";

const DEFAULT_TIMEOUT = 30_000;
const DEFAULT_RETRY_ATTEMPTS = 3;
const BASE_RETRY_DELAY = 1000;
const MAX_RETRY_DELAY = 30_000;

const LINK_NEXT_PAGE_REGEX = /<([^>]+)>;\s*rel="next-page"/;

const RATE_LIMITS: RateLimitConfig = {
  requestsPerMinute: 120,
  requestsPerHour: 3600,
  burstLimit: 20,
};

export interface GuruClient {
  readonly connectorId: string;
  get<T>(path: string, params?: Record<string, string>): Promise<T>;
  post<T>(path: string, body: unknown): Promise<T>;
  put<T>(path: string, body: unknown): Promise<T>;
  getPaginated<T>(
    path: string,
    params?: Record<string, string>
  ): AsyncGenerator<T[]>;
  healthCheck(): Promise<boolean>;
}

export function createGuruClient(config: GuruClientConfig): GuruClient {
  const { connectorId, email, apiToken, timeout = DEFAULT_TIMEOUT } = config;
  const authHeader = `Basic ${btoa(`${email}:${apiToken}`)}`;

  async function checkRateLimit(): Promise<void> {
    const { allowed } = await rateLimiter.checkConnectorRateLimit(
      connectorId,
      "guru",
      RATE_LIMITS
    );

    if (!allowed) {
      const quotaAvailable = await rateLimiter.waitForQuota(
        connectorId,
        "guru",
        RATE_LIMITS,
        5
      );

      if (!quotaAvailable) {
        throw new GuruApiError({
          message: "Rate limit exceeded",
          code: "RATE_LIMITED",
          retryable: true,
          retryAfter: 60,
        });
      }
    }
  }

  function buildHeaders(): Record<string, string> {
    return {
      Authorization: authHeader,
      Accept: "application/json",
      "Content-Type": "application/json",
    };
  }

  async function fetchJson<T>(
    path: string,
    params?: Record<string, string>,
    attempt = 0
  ): Promise<T> {
    await checkRateLimit();

    const url = new URL(`${GURU_API_BASE}${path}`);
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
        headers: buildHeaders(),
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
      throw new GuruApiError({
        message: "Rate limited",
        code: "RATE_LIMITED",
        retryable: true,
        retryAfter,
      });
    }

    if (response.status === 401) {
      throw new GuruApiError({
        message: "Unauthorized",
        code: "UNAUTHORIZED",
        retryable: false,
      });
    }

    if (response.status === 403) {
      throw new GuruApiError({
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
          "Guru API server error, retrying"
        );
        await sleep(delay);
        return fetchJson<T>(path, params, attempt + 1);
      }
      throw new GuruApiError({
        message: `Guru API ${response.status}: ${body}`,
        code: "API_ERROR",
        retryable: false,
      });
    }

    return response.json() as Promise<T>;
  }

  async function fetchWithNextPage<T>(
    url: string,
    attempt = 0
  ): Promise<{ data: T; nextPageUrl: string | null }> {
    await checkRateLimit();

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    let response: Response;
    try {
      response = await fetch(url, {
        headers: buildHeaders(),
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
        return fetchWithNextPage<T>(url, attempt + 1);
      }
      throw new GuruApiError({
        message: "Rate limited",
        code: "RATE_LIMITED",
        retryable: true,
        retryAfter,
      });
    }

    if (!response.ok) {
      const body = await response.text();
      if (response.status >= 500 && attempt < DEFAULT_RETRY_ATTEMPTS) {
        const delay = Math.min(
          BASE_RETRY_DELAY * 2 ** attempt,
          MAX_RETRY_DELAY
        );
        await sleep(delay);
        return fetchWithNextPage<T>(url, attempt + 1);
      }
      throw new GuruApiError({
        message: `Guru API ${response.status}: ${body}`,
        code: "API_ERROR",
        retryable: response.status >= 500,
      });
    }

    const linkHeader = response.headers.get("Link");
    let nextPageUrl: string | null = null;
    if (linkHeader) {
      const match = linkHeader.match(LINK_NEXT_PAGE_REGEX);
      if (match?.[1]) {
        nextPageUrl = match[1];
      }
    }

    const data = (await response.json()) as T;
    return { data, nextPageUrl };
  }

  async function* getPaginated<T>(
    path: string,
    params?: Record<string, string>
  ): AsyncGenerator<T[]> {
    const url = new URL(`${GURU_API_BASE}${path}`);
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        url.searchParams.set(key, value);
      }
    }

    let currentUrl: string | null = url.toString();

    while (currentUrl) {
      const pageResult: { data: T[]; nextPageUrl: string | null } =
        await fetchWithNextPage<T[]>(currentUrl);
      if (pageResult.data.length > 0) {
        yield pageResult.data;
      }
      currentUrl = pageResult.nextPageUrl;
    }
  }

  async function postJson<T>(path: string, body: unknown): Promise<T> {
    await checkRateLimit();

    const url = `${GURU_API_BASE}${path}`;
    const response = await fetch(url, {
      method: "POST",
      headers: buildHeaders(),
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeout),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new GuruApiError({
        message: `Guru API POST ${response.status}: ${text}`,
        code: response.status === 429 ? "RATE_LIMITED" : "API_ERROR",
        retryable: response.status >= 500,
      });
    }

    return response.json() as Promise<T>;
  }

  async function putJson<T>(path: string, body: unknown): Promise<T> {
    await checkRateLimit();

    const url = `${GURU_API_BASE}${path}`;
    const response = await fetch(url, {
      method: "PUT",
      headers: buildHeaders(),
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeout),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new GuruApiError({
        message: `Guru API PUT ${response.status}: ${text}`,
        code: response.status === 429 ? "RATE_LIMITED" : "API_ERROR",
        retryable: response.status >= 500,
      });
    }

    return response.json() as Promise<T>;
  }

  async function healthCheck(): Promise<boolean> {
    try {
      await fetchJson("/teams");
      return true;
    } catch {
      return false;
    }
  }

  return {
    connectorId,
    get: fetchJson,
    post: postJson,
    put: putJson,
    getPaginated,
    healthCheck,
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
