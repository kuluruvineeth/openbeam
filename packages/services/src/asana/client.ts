import { AsanaApiError } from "./types";

const BASE_URL = "https://app.asana.com/api/1.0";
const MAX_RETRIES = 3;

export type AsanaClientConfig = {
  connectorId: string;
  accessToken: string;
};

export type AsanaClient = {
  connectorId: string;
  get: <T>(path: string, params?: Record<string, string>) => Promise<T>;
  post: <T>(path: string, body: unknown) => Promise<T>;
  put: <T>(path: string, body: unknown) => Promise<T>;
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function calculateBackoff(attempt: number, retryAfter?: number): number {
  if (retryAfter) {
    return retryAfter * 1000;
  }
  const base = 1000;
  const jitter = Math.random() * 500;
  return base * 2 ** attempt + jitter;
}

type RequestOptions = {
  method: string;
  path: string;
  params?: Record<string, string>;
  body?: unknown;
};

export function createAsanaClient(config: AsanaClientConfig): AsanaClient {
  async function request<T>(opts: RequestOptions, attempt = 0): Promise<T> {
    const url = new URL(`${BASE_URL}${opts.path}`);
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

      throw new AsanaApiError({
        message: "Rate limited",
        code: "RATE_LIMITED",
        statusCode: 429,
        retryable: true,
        retryAfter,
      });
    }

    if (response.status === 401) {
      throw new AsanaApiError({
        message: "Unauthorized",
        code: "UNAUTHORIZED",
        statusCode: 401,
        retryable: false,
      });
    }

    if (response.status === 403) {
      throw new AsanaApiError({
        message: "Forbidden",
        code: "FORBIDDEN",
        statusCode: 403,
        retryable: false,
      });
    }

    if (response.status >= 500 && attempt < MAX_RETRIES) {
      await sleep(calculateBackoff(attempt));
      return request<T>(opts, attempt + 1);
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw new AsanaApiError({
        message: `Asana API error ${response.status}: ${errorText}`,
        code: "API_ERROR",
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
    put: <T>(path: string, body: unknown) =>
      request<T>({ method: "PUT", path, body }),
  };
}
