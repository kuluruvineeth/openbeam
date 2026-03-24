import { logger } from "../lib/logger";
import { HighspotApiError } from "./types";

const MAX_RETRY_ATTEMPTS = 3;
const BASE_RETRY_DELAY_MS = 1000;
const BASE_URL = "https://api.highspot.com/v1";

export type HighspotClientConfig = {
  connectorId: string;
  accessToken: string;
};

type HighspotListResponse<T> = {
  data: T[];
  pagination?: {
    offset: number;
    limit: number;
    total: number;
    next?: string;
  };
};

type HighspotErrorBody = {
  error?: string;
  message?: string;
  code?: string;
};

export type HighspotClient = {
  readonly connectorId: string;
  get<T>(path: string, params?: Record<string, string>): Promise<T>;
  post<T>(path: string, body: unknown): Promise<T>;
  put<T>(path: string, body: unknown): Promise<T>;
  list<T>(
    path: string,
    params?: Record<string, string>,
    limit?: number
  ): Promise<HighspotListResponse<T>>;
  listAll<T>(
    path: string,
    params?: Record<string, string>,
    limit?: number
  ): AsyncGenerator<T[], void, undefined>;
};

export function createHighspotClient(
  config: HighspotClientConfig
): HighspotClient {
  const { connectorId, accessToken } = config;

  async function request<T>(
    url: string,
    init?: RequestInit,
    attempt = 0
  ): Promise<T> {
    const response = await fetch(url, {
      ...init,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
        "Content-Type": "application/json",
        ...(init?.headers as Record<string, string>),
      },
    });

    if (response.status === 429) {
      const retryAfter = Number.parseInt(
        response.headers.get("Retry-After") ?? "10",
        10
      );
      if (attempt < MAX_RETRY_ATTEMPTS) {
        logger.warn(
          { connectorId, url, retryAfter, attempt },
          "Highspot API rate limited, retrying"
        );
        await new Promise((resolve) => setTimeout(resolve, retryAfter * 1000));
        return request<T>(url, init, attempt + 1);
      }
      throw new HighspotApiError({
        message: "Rate limited",
        statusCode: 429,
        code: "RATE_LIMITED",
        retryable: true,
        retryAfter,
      });
    }

    if (response.status === 401 || response.status === 403) {
      const body = await parseErrorBody(response);
      throw new HighspotApiError({
        message: body.message ?? body.error ?? "Authentication failed",
        statusCode: response.status,
        code: response.status === 401 ? "UNAUTHORIZED" : "FORBIDDEN",
        retryable: false,
      });
    }

    if (!response.ok) {
      const body = await parseErrorBody(response);
      const retryable = response.status >= 500;
      if (retryable && attempt < MAX_RETRY_ATTEMPTS) {
        const delayMs =
          BASE_RETRY_DELAY_MS * 2 ** attempt +
          Math.random() * BASE_RETRY_DELAY_MS;
        logger.warn(
          { connectorId, url, statusCode: response.status, attempt },
          "Highspot API server error, retrying"
        );
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        return request<T>(url, init, attempt + 1);
      }
      throw new HighspotApiError({
        message:
          body.message ?? body.error ?? `Request failed: ${response.status}`,
        statusCode: response.status,
        code: "SERVER_ERROR",
        retryable,
      });
    }

    return response.json() as Promise<T>;
  }

  async function parseErrorBody(
    response: Response
  ): Promise<HighspotErrorBody> {
    return (await response.json().catch(() => ({}))) as HighspotErrorBody;
  }

  function buildUrl(path: string, params?: Record<string, string>): string {
    const url = new URL(`${BASE_URL}${path}`);
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        url.searchParams.set(key, value);
      }
    }
    return url.toString();
  }

  function get<T>(path: string, params?: Record<string, string>): Promise<T> {
    return request<T>(buildUrl(path, params));
  }

  function post<T>(path: string, body: unknown): Promise<T> {
    return request<T>(buildUrl(path), {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  function put<T>(path: string, body: unknown): Promise<T> {
    return request<T>(buildUrl(path), {
      method: "PUT",
      body: JSON.stringify(body),
    });
  }

  function list<T>(
    path: string,
    params?: Record<string, string>,
    limit = 100
  ): Promise<HighspotListResponse<T>> {
    const mergedParams = { ...params, limit: String(limit) };
    return get<HighspotListResponse<T>>(path, mergedParams);
  }

  async function* listAll<T>(
    path: string,
    params?: Record<string, string>,
    limit = 100
  ): AsyncGenerator<T[], void, undefined> {
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
      const response = await list<T>(
        path,
        { ...params, offset: String(offset) },
        limit
      );
      const data = response.data ?? [];
      if (data.length > 0) {
        yield data;
      }
      const total = response.pagination?.total ?? 0;
      offset += data.length;
      hasMore = data.length >= limit && offset < total;
    }
  }

  return {
    connectorId,
    get,
    post,
    put,
    list,
    listAll,
  };
}
