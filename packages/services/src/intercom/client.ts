import { logger } from "../lib/logger";
import { IntercomApiError } from "./types";

const MAX_RETRY_ATTEMPTS = 3;
const BASE_RETRY_DELAY_MS = 1000;
const INTERCOM_API_VERSION = "2.11";

export type IntercomClientConfig = {
  connectorId: string;
  accessToken: string;
};

type IntercomErrorBody = {
  type?: string;
  message?: string;
  errors?: Array<{ code: string; message: string }>;
};

type CursorPaginatedResponse<T> = {
  pages?: {
    next?: { starting_after?: string } | null;
    total_pages?: number;
    per_page?: number;
    page?: number;
  };
} & T;

type SearchPaginatedResponse<T> = {
  pages?: {
    next?: { starting_after?: string } | null;
    total_pages?: number;
    per_page?: number;
    page?: number;
  };
  total_count?: number;
} & T;

export type IntercomClient = {
  readonly connectorId: string;
  get<T>(path: string, params?: Record<string, string>): Promise<T>;
  post<T>(path: string, body: unknown): Promise<T>;
  put<T>(path: string, body: unknown): Promise<T>;
  paginateList<T>(
    path: string,
    params?: Record<string, string>
  ): AsyncGenerator<CursorPaginatedResponse<T>, void, undefined>;
  searchPaginate<T>(
    path: string,
    body: Record<string, unknown>
  ): AsyncGenerator<SearchPaginatedResponse<T>, void, undefined>;
};

export function createIntercomClient(
  config: IntercomClientConfig
): IntercomClient {
  const { connectorId, accessToken } = config;
  const baseUrl = "https://api.intercom.io";

  function buildUrl(path: string, params?: Record<string, string>): string {
    const url = new URL(`${baseUrl}${path}`);
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        url.searchParams.set(key, value);
      }
    }
    return url.toString();
  }

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
        "Intercom-Version": INTERCOM_API_VERSION,
        ...init?.headers,
      },
    });

    if (response.status === 429) {
      const retryAfter = Number.parseInt(
        response.headers.get("X-RateLimit-Reset") ??
          response.headers.get("Retry-After") ??
          "10",
        10
      );
      if (attempt < MAX_RETRY_ATTEMPTS) {
        logger.warn(
          { connectorId, url, retryAfter, attempt },
          "Intercom API rate limited, retrying"
        );
        await sleep(retryAfter * 1000);
        return request<T>(url, init, attempt + 1);
      }
      throw new IntercomApiError({
        message: "Rate limited",
        statusCode: 429,
        code: "RATE_LIMITED",
        retryable: true,
        retryAfter,
      });
    }

    if (response.status === 401 || response.status === 403) {
      const body = (await response
        .json()
        .catch(() => ({}))) as IntercomErrorBody;
      throw new IntercomApiError({
        message:
          body.errors?.[0]?.message ?? body.message ?? "Authentication failed",
        statusCode: response.status,
        code: response.status === 401 ? "UNAUTHORIZED" : "FORBIDDEN",
        retryable: false,
      });
    }

    if (!response.ok) {
      const body = (await response
        .json()
        .catch(() => ({}))) as IntercomErrorBody;
      const retryable = response.status >= 500;
      if (retryable && attempt < MAX_RETRY_ATTEMPTS) {
        const delayMs =
          BASE_RETRY_DELAY_MS * 2 ** attempt +
          Math.random() * BASE_RETRY_DELAY_MS;
        logger.warn(
          { connectorId, url, statusCode: response.status, attempt },
          "Intercom API server error, retrying"
        );
        await sleep(delayMs);
        return request<T>(url, init, attempt + 1);
      }
      throw new IntercomApiError({
        message:
          body.errors?.[0]?.message ??
          body.message ??
          `Request failed: ${response.status}`,
        statusCode: response.status,
        code: body.type ?? "SERVER_ERROR",
        retryable,
      });
    }

    return response.json() as Promise<T>;
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

  async function* paginateList<T>(
    path: string,
    params?: Record<string, string>
  ): AsyncGenerator<CursorPaginatedResponse<T>, void, undefined> {
    let startingAfter: string | undefined;

    while (true) {
      const queryParams = { ...params };
      if (startingAfter) {
        queryParams.starting_after = startingAfter;
      }

      const page = await get<CursorPaginatedResponse<T>>(path, queryParams);
      yield page;

      const nextCursor = page.pages?.next?.starting_after;
      if (!nextCursor) {
        break;
      }
      startingAfter = nextCursor;
    }
  }

  async function* searchPaginate<T>(
    path: string,
    body: Record<string, unknown>
  ): AsyncGenerator<SearchPaginatedResponse<T>, void, undefined> {
    let startingAfter: string | undefined;

    while (true) {
      const requestBody = startingAfter
        ? {
            ...body,
            pagination: { starting_after: startingAfter, per_page: 150 },
          }
        : { ...body, pagination: { per_page: 150 } };

      const page = await post<SearchPaginatedResponse<T>>(path, requestBody);
      yield page;

      const nextCursor = page.pages?.next?.starting_after;
      if (!nextCursor) {
        break;
      }
      startingAfter = nextCursor;
    }
  }

  return {
    connectorId,
    get,
    post,
    put,
    paginateList,
    searchPaginate,
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
