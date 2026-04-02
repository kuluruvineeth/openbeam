import { type RateLimitConfig, rateLimiter } from "@openbeam/redis";
import type { MindtickleClientConfig } from "@openbeam/types/services/connectors/mindtickle";
import * as jwt from "jsonwebtoken";
import { logger } from "../lib/logger";
import { MindtickleApiError } from "./types";

const DEFAULT_TIMEOUT = 30_000;
const DEFAULT_RETRY_ATTEMPTS = 3;
const BASE_RETRY_DELAY = 1000;
const MAX_RETRY_DELAY = 30_000;
const JWT_EXPIRY_SECONDS = 3600;

const API_BASE = "https://api.mindtickle.com";

const RATE_LIMITS: RateLimitConfig = {
  requestsPerMinute: 60,
  requestsPerHour: 3600,
  burstLimit: 4,
};

export interface MindtickleClient {
  readonly connectorId: string;
  get<T>(path: string, params?: Record<string, string>): Promise<T>;
  post<T>(path: string, body: unknown): Promise<T>;
  put<T>(path: string, body: unknown): Promise<T>;
  patch<T>(path: string, body: unknown): Promise<T>;
  del<T>(path: string): Promise<T>;
  healthCheck(): Promise<boolean>;
}

function generateJwt(
  apiKey: string,
  secretKey: string,
  clientId: string
): string {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: apiKey,
    aud: clientId,
    iat: now,
    exp: now + JWT_EXPIRY_SECONDS,
    jti: crypto.randomUUID(),
  };
  return jwt.sign(payload, secretKey, { algorithm: "HS256" });
}

export function createMindtickleClient(
  config: MindtickleClientConfig
): MindtickleClient {
  const {
    connectorId,
    apiKey,
    secretKey,
    clientId,
    timeout = DEFAULT_TIMEOUT,
  } = config;

  let cachedToken: string | undefined;
  let tokenExpiresAt = 0;

  function getToken(): string {
    const now = Math.floor(Date.now() / 1000);
    const REFRESH_BUFFER = 300;
    if (cachedToken && tokenExpiresAt > now + REFRESH_BUFFER) {
      return cachedToken;
    }
    cachedToken = generateJwt(apiKey, secretKey, clientId);
    tokenExpiresAt = now + JWT_EXPIRY_SECONDS;
    return cachedToken;
  }

  function authHeaders(): Record<string, string> {
    return {
      Authorization: `Bearer ${getToken()}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    };
  }

  async function checkRateLimit(): Promise<void> {
    const { allowed } = await rateLimiter.checkConnectorRateLimit(
      connectorId,
      "mindtickle",
      RATE_LIMITS
    );

    if (!allowed) {
      const quotaAvailable = await rateLimiter.waitForQuota(
        connectorId,
        "mindtickle",
        RATE_LIMITS,
        5
      );

      if (!quotaAvailable) {
        throw new MindtickleApiError({
          message: "Rate limit exceeded",
          code: "RATE_LIMITED",
          retryable: true,
          retryAfter: 60,
        });
      }
    }
  }

  function resolveUrl(path: string): string {
    if (path.startsWith("/")) {
      return `${API_BASE}${path}`;
    }
    return `${API_BASE}/${path}`;
  }

  async function handleErrorResponse(
    response: Response,
    method: string,
    attempt: number
  ): Promise<never | undefined> {
    if (response.status === 429) {
      const retryAfter = Number.parseInt(
        response.headers.get("Retry-After") ?? "15",
        10
      );
      if (attempt < DEFAULT_RETRY_ATTEMPTS) {
        await sleep(Math.min(retryAfter * 1000, MAX_RETRY_DELAY));
        return;
      }
      throw new MindtickleApiError({
        message: "Rate limited",
        code: "RATE_LIMITED",
        statusCode: 429,
        retryable: true,
        retryAfter,
      });
    }

    if (response.status === 401) {
      cachedToken = undefined;
      tokenExpiresAt = 0;
      throw new MindtickleApiError({
        message:
          "Unauthorized — JWT is missing, malformed, or signed with incorrect secret",
        code: "UNAUTHORIZED",
        statusCode: 401,
        retryable: false,
      });
    }

    if (response.status === 403) {
      throw new MindtickleApiError({
        message:
          "Forbidden — JWT exp claim exceeds 1-hour window or insufficient permissions",
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
        { connectorId, status: response.status, attempt, method },
        "Mindtickle API server error, retrying"
      );
      await sleep(delay);
      return;
    }

    throw new MindtickleApiError({
      message: `Mindtickle API ${method} ${response.status}: ${body}`,
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

    const url = new URL(resolveUrl(path));
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
        headers: authHeaders(),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      const shouldRetry = await handleErrorResponse(response, "GET", attempt);
      if (shouldRetry === undefined) {
        return fetchJson<T>(path, params, attempt + 1);
      }
    }

    return response.json() as Promise<T>;
  }

  async function mutate<T>(
    method: "POST" | "PUT" | "PATCH" | "DELETE",
    path: string,
    body?: unknown,
    attempt = 0
  ): Promise<T> {
    await checkRateLimit();

    const url = resolveUrl(path);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const init: RequestInit = {
      method,
      headers: authHeaders(),
      signal: controller.signal,
    };
    if (body !== undefined && method !== "DELETE") {
      init.body = JSON.stringify(body);
    }

    let response: Response;
    try {
      response = await fetch(url, init);
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      const shouldRetry = await handleErrorResponse(response, method, attempt);
      if (shouldRetry === undefined) {
        return mutate<T>(method, path, body, attempt + 1);
      }
    }

    const text = await response.text();
    if (!text) {
      return {} as T;
    }
    return JSON.parse(text) as T;
  }

  async function healthCheck(): Promise<boolean> {
    try {
      await fetchJson<unknown>("/openapi/settings/profile");
      return true;
    } catch {
      return false;
    }
  }

  return {
    connectorId,
    get: fetchJson,
    post: <T>(path: string, body: unknown) => mutate<T>("POST", path, body),
    put: <T>(path: string, body: unknown) => mutate<T>("PUT", path, body),
    patch: <T>(path: string, body: unknown) => mutate<T>("PATCH", path, body),
    del: <T>(path: string) => mutate<T>("DELETE", path),
    healthCheck,
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
