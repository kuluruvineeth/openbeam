import { type RateLimitConfig, rateLimiter } from "@openplane/redis";
import type {
  GmailClientConfig,
  GmailRateLimitState,
} from "@openplane/types/services/connectors/gmail";
import { logger } from "../lib/logger";
import { getValidAccessToken } from "../lib/token-refresh";
import { GmailApiError, GmailErrorCodes } from "./types";

const GMAIL_API_BASE = "https://gmail.googleapis.com/gmail/v1";
const DEFAULT_TIMEOUT = 30_000;
const DEFAULT_RETRY_ATTEMPTS = 3;
const BASE_RETRY_DELAY = 1000;
const MAX_RETRY_DELAY = 30_000;

const DEFAULT_RATE_LIMITS: RateLimitConfig = {
  requestsPerMinute: 100,
  requestsPerHour: 5000,
  burstLimit: 30,
};

const BATCH_BOUNDARY_REGEX = /--batch_[\w-]+/;
const JSON_OBJECT_REGEX = /\{[\s\S]*\}/;
const HTTP_STATUS_REGEX = /HTTP\/1\.1 (\d+)/;

type GmailParamValue = string | number | boolean | string[] | undefined;

export interface GmailClient {
  readonly connectorId: string;
  readonly userEmail?: string;
  get<T>(path: string, params?: Record<string, GmailParamValue>): Promise<T>;
  post<T>(path: string, body?: unknown): Promise<T>;
  batchGet<T>(paths: string[]): Promise<T[]>;
  getRateLimitState(): Promise<GmailRateLimitState>;
  healthCheck(): Promise<boolean>;
}

interface ClientState {
  lastRateLimitHit?: number;
  consecutiveErrors: number;
  lastError?: Error;
}

export function createGmailClient(config: GmailClientConfig): GmailClient {
  const {
    connectorId,
    accessToken: providedToken,
    userEmail,
    rateLimitConfig = DEFAULT_RATE_LIMITS,
    timeout = DEFAULT_TIMEOUT,
    debug = false,
  } = config;

  const state: ClientState = {
    consecutiveErrors: 0,
  };

  let cachedToken: string | undefined = providedToken;

  async function getAccessToken(): Promise<string> {
    if (cachedToken) {
      return cachedToken;
    }
    cachedToken = await getValidAccessToken(connectorId);
    return cachedToken;
  }

  async function checkRateLimit(method: string): Promise<void> {
    const { allowed, reason } = await rateLimiter.checkConnectorRateLimit(
      connectorId,
      "gmail",
      rateLimitConfig as RateLimitConfig
    );

    if (!allowed) {
      if (debug) {
        logger.debug({ method, reason }, "Gmail rate limit hit");
      }

      state.lastRateLimitHit = Date.now();

      const quotaAvailable = await rateLimiter.waitForQuota(
        connectorId,
        "gmail",
        rateLimitConfig as RateLimitConfig,
        5
      );

      if (!quotaAvailable) {
        throw new GmailApiError(
          `Rate limit exceeded for ${method}`,
          GmailErrorCodes.RATE_LIMITED,
          true,
          60
        );
      }
    }
  }

  function calculateRetryDelay(attempt: number, retryAfter?: number): number {
    if (retryAfter) {
      return retryAfter * 1000;
    }
    const exponentialDelay = BASE_RETRY_DELAY * 2 ** attempt;
    const jitter = Math.random() * 1000;
    return Math.min(exponentialDelay + jitter, MAX_RETRY_DELAY);
  }

  function buildUrl(
    path: string,
    params?: Record<string, GmailParamValue>
  ): string {
    const url = new URL(`${GMAIL_API_BASE}${path}`);
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value === undefined) {
          continue;
        }
        if (Array.isArray(value)) {
          for (const item of value) {
            url.searchParams.append(key, item);
          }
        } else {
          url.searchParams.set(key, String(value));
        }
      }
    }
    return url.toString();
  }

  async function executeRequest<T>(
    method: "GET" | "POST",
    path: string,
    options: {
      params?: Record<string, GmailParamValue>;
      body?: unknown;
    } = {},
    attempt = 0
  ): Promise<T> {
    try {
      await checkRateLimit(path);

      const token = await getAccessToken();
      const url = buildUrl(path, options.params);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const fetchOptions: RequestInit = {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        signal: controller.signal,
      };

      if (method === "POST" && options.body) {
        fetchOptions.body = JSON.stringify(options.body);
      }

      const response = await fetch(url, fetchOptions);
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorBody = (await response.json().catch(() => ({}))) as {
          error?: { message?: string; code?: number; status?: string };
        };
        throw GmailApiError.fromResponse(response.status, errorBody);
      }

      state.consecutiveErrors = 0;
      return (await response.json()) as T;
    } catch (error) {
      return handleRetryableError<T>(error, method, path, options, attempt);
    }
  }

  // biome-ignore lint/nursery/useMaxParams: internal function with related parameters
  async function handleRetryableError<T>(
    error: unknown,
    method: "GET" | "POST",
    path: string,
    options: {
      params?: Record<string, GmailParamValue>;
      body?: unknown;
    },
    attempt: number
  ): Promise<T> {
    state.consecutiveErrors += 1;
    state.lastError = error instanceof Error ? error : new Error(String(error));

    const canRetry = attempt < DEFAULT_RETRY_ATTEMPTS;

    if (error instanceof GmailApiError) {
      if (GmailApiError.isAuthError(error.code)) {
        throw error;
      }

      if (error.retryable && canRetry) {
        return await retryWithDelay<T>(
          method,
          path,
          options,
          attempt,
          error.retryAfter
        );
      }

      throw error;
    }

    if (error instanceof Error && error.name === "AbortError") {
      if (canRetry) {
        return await retryWithDelay<T>(method, path, options, attempt);
      }
      throw new GmailApiError("Request timeout", "timeout", false);
    }

    if (canRetry) {
      return await retryWithDelay<T>(method, path, options, attempt);
    }

    throw new Error(
      `Gmail ${method} ${path} failed for connector ${connectorId} after ${DEFAULT_RETRY_ATTEMPTS} attempts`,
      { cause: error }
    );
  }

  // biome-ignore lint/nursery/useMaxParams: internal function with related parameters
  async function retryWithDelay<T>(
    method: "GET" | "POST",
    path: string,
    options: {
      params?: Record<string, GmailParamValue>;
      body?: unknown;
    },
    attempt: number,
    retryAfter?: number
  ): Promise<T> {
    const delay = calculateRetryDelay(attempt, retryAfter);
    if (debug) {
      logger.debug(
        { path, delay, attempt: attempt + 1 },
        "Gmail retrying request"
      );
    }
    await sleep(delay);
    return await executeRequest<T>(method, path, options, attempt + 1);
  }

  async function get<T>(
    path: string,
    params?: Record<string, GmailParamValue>
  ): Promise<T> {
    return await executeRequest<T>("GET", path, { params });
  }

  async function post<T>(path: string, body?: unknown): Promise<T> {
    return await executeRequest<T>("POST", path, { body });
  }

  async function batchGet<T>(paths: string[]): Promise<T[]> {
    const token = await getAccessToken();
    const boundary = `batch_${Date.now()}`;

    const batchBody = `${paths
      .map(
        (path, idx) =>
          `--${boundary}\r\n` +
          "Content-Type: application/http\r\n" +
          "Content-Transfer-Encoding: binary\r\n" +
          `Content-ID: <item${idx}>\r\n\r\n` +
          `GET /gmail/v1${path} HTTP/1.1\r\n` +
          "Host: gmail.googleapis.com\r\n" +
          `Authorization: Bearer ${token}\r\n\r\n`
      )
      .join("")}--${boundary}--`;

    await checkRateLimit("batch");

    const response = await fetch(
      "https://gmail.googleapis.com/batch/gmail/v1",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": `multipart/mixed; boundary=${boundary}`,
        },
        body: batchBody,
      }
    );

    if (!response.ok) {
      const errorBody = (await response.json().catch(() => ({}))) as {
        error?: { message?: string; code?: number; status?: string };
      };
      throw GmailApiError.fromResponse(response.status, errorBody);
    }

    const responseText = await response.text();
    return parseBatchResponse<T>(responseText);
  }

  async function getRateLimitState(): Promise<GmailRateLimitState> {
    const quota = await rateLimiter.getRemainingQuota(
      connectorId,
      "gmail",
      rateLimitConfig as RateLimitConfig
    );

    return {
      remaining: quota.minuteRemaining ?? 0,
      resetAt: Date.now() + 60_000,
      retryAfter: state.lastRateLimitHit
        ? Math.max(0, 60_000 - (Date.now() - state.lastRateLimitHit))
        : undefined,
    };
  }

  async function healthCheck(): Promise<boolean> {
    try {
      const path = "/users/me/profile";
      await get(path);
      return true;
    } catch (error) {
      logger.debug({ error, connectorId }, "Gmail health check failed");
      return false;
    }
  }

  return {
    connectorId,
    userEmail,
    get,
    post,
    batchGet,
    getRateLimitState,
    healthCheck,
  };
}

function parseBatchResponse<T>(responseText: string): T[] {
  const results: T[] = [];
  const boundaryMatch = responseText.match(BATCH_BOUNDARY_REGEX);
  if (!boundaryMatch) {
    const preview = responseText.slice(0, 500);
    logger.error(
      { responsePreview: preview },
      "Gmail batch response: no boundary found"
    );
    throw new GmailApiError(
      "Invalid batch response: no boundary found",
      "batch_parse_error",
      false
    );
  }

  const boundary = boundaryMatch[0];
  const parts = responseText.split(boundary).slice(1, -1);

  logger.debug({ partsCount: parts.length }, "Gmail batch response parts");

  for (const part of parts) {
    const statusMatch = part.match(HTTP_STATUS_REGEX);
    const status = statusMatch?.[1] ? Number.parseInt(statusMatch[1], 10) : 0;

    const jsonMatch = part.match(JSON_OBJECT_REGEX);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]) as T & { error?: unknown };
        if (parsed.error) {
          logger.warn(
            { error: parsed.error, status },
            "Gmail batch response item has error"
          );
        }
        results.push(parsed);
      } catch (e) {
        logger.warn(
          { parseError: e instanceof Error ? e.message : String(e), status },
          "Gmail batch response JSON parse failed"
        );
      }
    } else if (status !== 200) {
      logger.warn(
        { status, partPreview: part.slice(0, 200) },
        "Gmail batch response part has no JSON"
      );
    }
  }

  return results;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export { DEFAULT_RATE_LIMITS, DEFAULT_TIMEOUT };
