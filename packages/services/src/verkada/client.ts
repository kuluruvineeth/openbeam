import { type RateLimitConfig, rateLimiter } from "@openbeam/redis";
import {
  VERKADA_API_BASE_AU,
  VERKADA_API_BASE_EU,
  VERKADA_API_BASE_US,
  type VerkadaClientConfig,
} from "@openbeam/types/services/connectors/verkada";
import { logger } from "../lib/logger";
import { VerkadaApiError } from "./types";

const DEFAULT_TIMEOUT = 30_000;
const DEFAULT_RETRY_ATTEMPTS = 3;
const BASE_RETRY_DELAY = 1000;
const MAX_RETRY_DELAY = 30_000;
const TOKEN_TTL_MS = 25 * 60 * 1000;

const RATE_LIMITS: RateLimitConfig = {
  requestsPerMinute: 300,
  requestsPerHour: 18_000,
  burstLimit: 50,
};

export interface VerkadaClient {
  readonly connectorId: string;
  get<T>(path: string, params?: Record<string, string>): Promise<T>;
  post<T>(path: string, body: unknown): Promise<T>;
  healthCheck(): Promise<boolean>;
}

export function createVerkadaClient(
  config: VerkadaClientConfig
): VerkadaClient {
  const {
    connectorId,
    apiKey,
    region = "us",
    timeout = DEFAULT_TIMEOUT,
  } = config;

  const regionBaseUrls: Record<string, string> = {
    eu: VERKADA_API_BASE_EU,
    au: VERKADA_API_BASE_AU,
  };
  const baseUrl = regionBaseUrls[region] ?? VERKADA_API_BASE_US;

  let cachedToken: string | null = null;
  let tokenExpiresAt = 0;

  async function getToken(): Promise<string> {
    if (cachedToken && Date.now() < tokenExpiresAt) {
      return cachedToken;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    let response: Response;
    try {
      response = await fetch(`${baseUrl}/token`, {
        method: "POST",
        headers: { "x-api-key": apiKey },
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }

    if (response.status === 401) {
      throw new VerkadaApiError({
        message: "Invalid API key",
        code: "UNAUTHORIZED",
        retryable: false,
      });
    }

    if (!response.ok) {
      const body = await response.text();
      throw new VerkadaApiError({
        message: `Token exchange failed ${response.status}: ${body}`,
        code: "TOKEN_ERROR",
        retryable: response.status >= 500,
      });
    }

    const data = (await response.json()) as { token: string };
    cachedToken = data.token;
    tokenExpiresAt = Date.now() + TOKEN_TTL_MS;
    return cachedToken;
  }

  async function checkRateLimit(): Promise<void> {
    const { allowed } = await rateLimiter.checkConnectorRateLimit(
      connectorId,
      "verkada",
      RATE_LIMITS
    );

    if (!allowed) {
      const quotaAvailable = await rateLimiter.waitForQuota(
        connectorId,
        "verkada",
        RATE_LIMITS,
        5
      );

      if (!quotaAvailable) {
        throw new VerkadaApiError({
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

    const token = await getToken();
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
        headers: { "x-verkada-auth": token },
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }

    if (response.status === 401) {
      if (attempt === 0) {
        cachedToken = null;
        tokenExpiresAt = 0;
        return fetchJson<T>(path, params, attempt + 1);
      }
      throw new VerkadaApiError({
        message: "Unauthorized",
        code: "UNAUTHORIZED",
        retryable: false,
      });
    }

    if (response.status === 429) {
      if (attempt < DEFAULT_RETRY_ATTEMPTS) {
        const delay = Math.min(5000 * 2 ** attempt, MAX_RETRY_DELAY);
        await sleep(delay);
        return fetchJson<T>(path, params, attempt + 1);
      }
      throw new VerkadaApiError({
        message: "Rate limited",
        code: "RATE_LIMITED",
        retryable: true,
        retryAfter: 5,
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
          "Verkada API server error, retrying"
        );
        await sleep(delay);
        return fetchJson<T>(path, params, attempt + 1);
      }
      throw new VerkadaApiError({
        message: `Verkada API ${response.status}: ${body}`,
        code: "API_ERROR",
        retryable: false,
      });
    }

    return response.json() as Promise<T>;
  }

  async function healthCheck(): Promise<boolean> {
    try {
      await getToken();
      return true;
    } catch {
      return false;
    }
  }

  async function postJson<T>(path: string, body: unknown): Promise<T> {
    await checkRateLimit();
    const token = await getToken();
    const url = `${baseUrl}${path}`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "x-verkada-token": token,
        "x-verkada-auth": apiKey,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeout),
    });
    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new VerkadaApiError({
        message: `Verkada API POST ${response.status}: ${text}`,
        code: response.status === 429 ? "RATE_LIMITED" : "API_ERROR",
        retryable: response.status >= 500,
      });
    }
    return response.json() as Promise<T>;
  }

  return {
    connectorId,
    get: fetchJson,
    post: postJson,
    healthCheck,
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
