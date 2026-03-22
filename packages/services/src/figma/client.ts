import { FIGMA_API_URL } from "@openbeam/types/services/connectors/figma";
import { FigmaApiError } from "./types";

const MAX_RETRIES = 3;
const MIN_REQUEST_INTERVAL_MS = 2100;

export type FigmaClientConfig = {
  connectorId: string;
  accessToken: string;
};

export type FigmaClient = {
  connectorId: string;
  get: <T>(path: string, params?: Record<string, string>) => Promise<T>;
  post: <T>(path: string, body: unknown) => Promise<T>;
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function calculateBackoff(attempt: number, retryAfter?: number): number {
  if (retryAfter) {
    return retryAfter * 1000;
  }
  const base = 2000;
  const jitter = Math.random() * 1000;
  return base * 2 ** attempt + jitter;
}

type RequestOptions = {
  method: string;
  path: string;
  params?: Record<string, string>;
  body?: unknown;
};

export function createFigmaClient(config: FigmaClientConfig): FigmaClient {
  let lastRequestTime = 0;

  async function throttle(): Promise<void> {
    const elapsed = Date.now() - lastRequestTime;
    if (elapsed < MIN_REQUEST_INTERVAL_MS) {
      await sleep(MIN_REQUEST_INTERVAL_MS - elapsed);
    }
    lastRequestTime = Date.now();
  }

  async function request<T>(opts: RequestOptions, attempt = 0): Promise<T> {
    await throttle();

    const url = new URL(`${FIGMA_API_URL}${opts.path}`);
    if (opts.params) {
      for (const [key, value] of Object.entries(opts.params)) {
        url.searchParams.set(key, value);
      }
    }

    const headers: Record<string, string> = {
      Authorization: `Bearer ${config.accessToken}`,
      Accept: "application/json",
    };

    if (opts.body) {
      headers["Content-Type"] = "application/json";
    }

    const response = await fetch(url.toString(), {
      method: opts.method,
      headers,
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    });

    if (response.status === 429) {
      const retryAfter = Number.parseInt(
        response.headers.get("Retry-After") ?? "60",
        10
      );

      if (attempt < MAX_RETRIES) {
        await sleep(calculateBackoff(attempt, retryAfter));
        return request<T>(opts, attempt + 1);
      }

      throw new FigmaApiError({
        message: "Rate limited",
        code: "RATE_LIMITED",
        statusCode: 429,
        retryable: true,
        retryAfter,
      });
    }

    if (response.status === 401) {
      throw new FigmaApiError({
        message: "Unauthorized",
        code: "UNAUTHORIZED",
        statusCode: 401,
        retryable: false,
      });
    }

    if (response.status === 403) {
      throw new FigmaApiError({
        message: "Forbidden",
        code: "FORBIDDEN",
        statusCode: 403,
        retryable: false,
      });
    }

    if (response.status === 404) {
      throw new FigmaApiError({
        message: "Not found",
        code: "NOT_FOUND",
        statusCode: 404,
        retryable: false,
      });
    }

    if (response.status >= 500) {
      if (attempt < MAX_RETRIES) {
        await sleep(calculateBackoff(attempt));
        return request<T>(opts, attempt + 1);
      }

      throw new FigmaApiError({
        message: `Server error: ${response.status}`,
        code: "INTERNAL_ERROR",
        statusCode: response.status,
        retryable: true,
      });
    }

    if (!response.ok) {
      const text = await response.text();
      throw new FigmaApiError({
        message: `Figma API error ${response.status}: ${text}`,
        code: "INTERNAL_ERROR",
        statusCode: response.status,
        retryable: false,
      });
    }

    return (await response.json()) as T;
  }

  return {
    connectorId: config.connectorId,
    get: <T>(path: string, params?: Record<string, string>) =>
      request<T>({ method: "GET", path, params }),
    post: <T>(path: string, body: unknown) =>
      request<T>({ method: "POST", path, body }),
  };
}
