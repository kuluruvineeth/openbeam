import { type RateLimitConfig, rateLimiter } from "@openplane/redis";
import type {
  GoogleDriveClientConfig,
  GoogleDriveRateLimitState,
} from "@openplane/types/services/connectors/google-drive";
import { logger } from "../lib/logger";
import { getValidAccessToken } from "../lib/token-refresh";
import { GoogleDriveApiError, GoogleDriveErrorCodes } from "./types";

const DRIVE_API_BASE = "https://www.googleapis.com/drive/v3";
const DEFAULT_TIMEOUT = 30_000;
const DEFAULT_RETRY_ATTEMPTS = 3;
const BASE_RETRY_DELAY = 1000;
const MAX_RETRY_DELAY = 30_000;

const DEFAULT_RATE_LIMITS: RateLimitConfig = {
  requestsPerMinute: 100,
  requestsPerHour: 10_000,
  burstLimit: 30,
};

const BATCH_BOUNDARY_REGEX = /--batch_[\w-]+/;
const JSON_OBJECT_REGEX = /\{[\s\S]*\}/;
const HTTP_STATUS_REGEX = /HTTP\/1\.1 (\d+)/;

type DriveParamValue = string | number | boolean | string[] | undefined;

export interface GoogleDriveClient {
  readonly connectorId: string;
  readonly userEmail?: string;
  get<T>(path: string, params?: Record<string, DriveParamValue>): Promise<T>;
  post<T>(path: string, body?: unknown): Promise<T>;
  patch<T>(path: string, body?: unknown): Promise<T>;
  delete(path: string): Promise<void>;
  batchGet<T>(paths: string[]): Promise<T[]>;
  download(fileId: string): Promise<ArrayBuffer>;
  export(fileId: string, mimeType: string): Promise<string>;
  getRateLimitState(): Promise<GoogleDriveRateLimitState>;
  healthCheck(): Promise<boolean>;
}

interface ClientState {
  lastRateLimitHit?: number;
  consecutiveErrors: number;
  lastError?: Error;
}

export function createGoogleDriveClient(
  config: GoogleDriveClientConfig
): GoogleDriveClient {
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
      "google-drive",
      rateLimitConfig as RateLimitConfig
    );

    if (!allowed) {
      if (debug) {
        logger.debug({ method, reason }, "Google Drive rate limit hit");
      }

      state.lastRateLimitHit = Date.now();

      const quotaAvailable = await rateLimiter.waitForQuota(
        connectorId,
        "google-drive",
        rateLimitConfig as RateLimitConfig,
        5
      );

      if (!quotaAvailable) {
        throw new GoogleDriveApiError({
          message: `Rate limit exceeded for ${method}`,
          code: GoogleDriveErrorCodes.RATE_LIMITED,
          retryable: true,
          retryAfter: 60,
        });
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

  function appendParam(url: URL, key: string, value: DriveParamValue): void {
    if (value === undefined) {
      return;
    }
    if (Array.isArray(value)) {
      for (const item of value) {
        url.searchParams.append(key, item);
      }
    } else {
      url.searchParams.set(key, String(value));
    }
  }

  function buildUrl(
    path: string,
    params?: Record<string, DriveParamValue>
  ): string {
    const url = new URL(`${DRIVE_API_BASE}${path}`);
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        appendParam(url, key, value);
      }
    }
    return url.toString();
  }

  async function executeRequest<T>(
    method: "GET" | "POST" | "PATCH" | "DELETE",
    path: string,
    options: {
      params?: Record<string, DriveParamValue>;
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

      if ((method === "POST" || method === "PATCH") && options.body) {
        fetchOptions.body = JSON.stringify(options.body);
      }

      const response = await fetch(url, fetchOptions);
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorBody = (await response.json().catch(() => ({}))) as {
          error?: { message?: string; code?: number; status?: string };
        };
        throw GoogleDriveApiError.fromResponse(response.status, errorBody);
      }

      if (method === "DELETE") {
        state.consecutiveErrors = 0;
        return undefined as T;
      }

      state.consecutiveErrors = 0;
      return (await response.json()) as T;
    } catch (error) {
      return handleRetryableError<T>(error, { method, path, options, attempt });
    }
  }

  interface RequestContext {
    method: "GET" | "POST" | "PATCH" | "DELETE";
    path: string;
    options: { params?: Record<string, DriveParamValue>; body?: unknown };
    attempt: number;
  }

  function shouldRetry(
    error: unknown,
    attempt: number
  ): { retry: boolean; delay?: number } {
    const canRetry = attempt < DEFAULT_RETRY_ATTEMPTS;

    if (error instanceof GoogleDriveApiError) {
      if (GoogleDriveApiError.isAuthError(error.code)) {
        return { retry: false };
      }
      return { retry: error.retryable && canRetry, delay: error.retryAfter };
    }

    if (error instanceof Error && error.name === "AbortError") {
      return { retry: canRetry };
    }

    return { retry: canRetry };
  }

  async function handleRetryableError<T>(
    error: unknown,
    ctx: RequestContext
  ): Promise<T> {
    state.consecutiveErrors += 1;
    state.lastError = error as Error;

    const { retry, delay } = shouldRetry(error, ctx.attempt);

    if (retry) {
      return await retryWithDelay<T>(ctx, delay);
    }

    if (error instanceof Error && error.name === "AbortError") {
      throw new GoogleDriveApiError({
        message: "Request timeout",
        code: "timeout",
      });
    }

    throw new Error(
      `Google Drive ${ctx.method} ${ctx.path} failed for connector ${connectorId}`,
      { cause: error }
    );
  }

  async function retryWithDelay<T>(
    ctx: RequestContext,
    retryAfter?: number
  ): Promise<T> {
    const delay = calculateRetryDelay(ctx.attempt, retryAfter);
    if (debug) {
      logger.debug(
        { path: ctx.path, delay, attempt: ctx.attempt + 1 },
        "Google Drive retrying request"
      );
    }
    await sleep(delay);
    return await executeRequest<T>(
      ctx.method,
      ctx.path,
      ctx.options,
      ctx.attempt + 1
    );
  }

  async function get<T>(
    path: string,
    params?: Record<string, DriveParamValue>
  ): Promise<T> {
    return await executeRequest<T>("GET", path, { params });
  }

  async function post<T>(path: string, body?: unknown): Promise<T> {
    return await executeRequest<T>("POST", path, { body });
  }

  async function patch<T>(path: string, body?: unknown): Promise<T> {
    return await executeRequest<T>("PATCH", path, { body });
  }

  async function del(path: string): Promise<void> {
    await executeRequest<void>("DELETE", path);
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
          `GET /drive/v3${path} HTTP/1.1\r\n` +
          "Host: www.googleapis.com\r\n" +
          `Authorization: Bearer ${token}\r\n\r\n`
      )
      .join("")}--${boundary}--`;

    await checkRateLimit("batch");

    const response = await fetch("https://www.googleapis.com/batch/drive/v3", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": `multipart/mixed; boundary=${boundary}`,
      },
      body: batchBody,
    });

    if (!response.ok) {
      const errorBody = (await response.json().catch(() => ({}))) as {
        error?: { message?: string; code?: number; status?: string };
      };
      throw GoogleDriveApiError.fromResponse(response.status, errorBody);
    }

    const responseText = await response.text();
    return parseBatchResponse<T>(responseText);
  }

  async function download(fileId: string): Promise<ArrayBuffer> {
    await checkRateLimit("download");
    const token = await getAccessToken();

    const response = await fetch(
      `${DRIVE_API_BASE}/files/${fileId}?alt=media`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      const errorBody = (await response.json().catch(() => ({}))) as {
        error?: { message?: string; code?: number; status?: string };
      };
      throw GoogleDriveApiError.fromResponse(response.status, errorBody);
    }

    return await response.arrayBuffer();
  }

  async function exportFile(fileId: string, mimeType: string): Promise<string> {
    await checkRateLimit("export");
    const token = await getAccessToken();

    const response = await fetch(
      `${DRIVE_API_BASE}/files/${fileId}/export?mimeType=${encodeURIComponent(mimeType)}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      const errorBody = (await response.json().catch(() => ({}))) as {
        error?: { message?: string; code?: number; status?: string };
      };
      throw GoogleDriveApiError.fromResponse(response.status, errorBody);
    }

    return await response.text();
  }

  async function getRateLimitState(): Promise<GoogleDriveRateLimitState> {
    const quota = await rateLimiter.getRemainingQuota(
      connectorId,
      "google-drive",
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
      await get("/about", { fields: "user" });
      return true;
    } catch (error) {
      logger.debug({ error, connectorId }, "Google Drive health check failed");
      return false;
    }
  }

  return {
    connectorId,
    userEmail,
    get,
    post,
    patch,
    delete: del,
    batchGet,
    download,
    export: exportFile,
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
      "Google Drive batch response: no boundary found"
    );
    throw new GoogleDriveApiError({
      message: "Invalid batch response: no boundary found",
      code: "batch_parse_error",
    });
  }

  const boundary = boundaryMatch[0];
  const parts = responseText.split(boundary).slice(1, -1);

  logger.debug(
    { partsCount: parts.length },
    "Google Drive batch response parts"
  );

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
            "Google Drive batch response item has error"
          );
        }
        results.push(parsed);
      } catch (e) {
        logger.warn(
          { parseError: (e as Error).message, status },
          "Google Drive batch response JSON parse failed"
        );
      }
    } else if (status !== 200) {
      logger.warn(
        { status, partPreview: part.slice(0, 200) },
        "Google Drive batch response part has no JSON"
      );
    }
  }

  return results;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export { DEFAULT_RATE_LIMITS, DEFAULT_TIMEOUT };
