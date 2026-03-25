import { logger } from "../lib/logger";
import { LucidApiError } from "./types";

const MAX_RETRY_ATTEMPTS = 3;
const BASE_RETRY_DELAY_MS = 1000;

export type LucidClientConfig = {
  connectorId: string;
  accessToken: string;
};

type LucidListResponse<T> = {
  data: T[];
  nextPageToken?: string;
};

type LucidErrorBody = {
  error?: string;
  message?: string;
};

export type LucidClient = {
  readonly connectorId: string;
  get<T>(path: string, params?: Record<string, string>): Promise<T>;
  post<T>(path: string, body: unknown): Promise<T>;
  patch<T>(path: string, body: unknown): Promise<T>;
  list<T>(
    path: string,
    params?: Record<string, string>,
    limit?: number
  ): Promise<LucidListResponse<T>>;
  listAll<T>(
    path: string,
    params?: Record<string, string>,
    limit?: number
  ): AsyncGenerator<T[], void, undefined>;
};

export function createLucidClient(config: LucidClientConfig): LucidClient {
  const { connectorId, accessToken } = config;
  const baseUrl = "https://api.lucid.co";

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
        "Lucid-Api-Version": "1",
        ...(init?.headers as Record<string, string>),
      },
    });

    if (response.status === 429) {
      const retryAfter = Number.parseInt(
        response.headers.get("Retry-After") ?? "60",
        10
      );
      if (attempt < MAX_RETRY_ATTEMPTS) {
        logger.warn(
          { connectorId, url, retryAfter, attempt },
          "Lucid API rate limited, retrying"
        );
        await new Promise((resolve) => setTimeout(resolve, retryAfter * 1000));
        return request<T>(url, init, attempt + 1);
      }
      throw new LucidApiError({
        message: "Rate limited",
        statusCode: 429,
        code: "RATE_LIMITED",
        retryable: true,
        retryAfter,
      });
    }

    if (response.status === 401 || response.status === 403) {
      const body = await parseErrorBody(response);
      throw new LucidApiError({
        message: body.error ?? body.message ?? "Authentication failed",
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
          "Lucid API server error, retrying"
        );
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        return request<T>(url, init, attempt + 1);
      }
      throw new LucidApiError({
        message:
          body.error ?? body.message ?? `Request failed: ${response.status}`,
        statusCode: response.status,
        code: "SERVER_ERROR",
        retryable,
      });
    }

    return response.json() as Promise<T>;
  }

  async function parseErrorBody(response: Response): Promise<LucidErrorBody> {
    return (await response.json().catch(() => ({}))) as LucidErrorBody;
  }

  function buildUrl(path: string, params?: Record<string, string>): string {
    const url = new URL(`${baseUrl}${path}`);
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

  function patch<T>(path: string, body: unknown): Promise<T> {
    return request<T>(buildUrl(path), {
      method: "PATCH",
      body: JSON.stringify(body),
    });
  }

  function list<T>(
    path: string,
    params?: Record<string, string>,
    limit = 100
  ): Promise<LucidListResponse<T>> {
    const mergedParams = { ...params, limit: String(limit) };
    return get<LucidListResponse<T>>(path, mergedParams);
  }

  async function* listAll<T>(
    path: string,
    params?: Record<string, string>,
    limit = 100
  ): AsyncGenerator<T[], void, undefined> {
    let pageToken: string | undefined;
    let hasMore = true;

    while (hasMore) {
      const queryParams: Record<string, string> = {
        ...params,
        limit: String(limit),
      };
      if (pageToken) {
        queryParams.pageToken = pageToken;
      }

      const response = await list<T>(path, queryParams, limit);
      const data = response.data ?? [];
      if (data.length > 0) {
        yield data;
      }
      pageToken = response.nextPageToken;
      hasMore = !!pageToken;
    }
  }

  return {
    connectorId,
    get,
    post,
    patch,
    list,
    listAll,
  };
}
