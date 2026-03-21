import { logger } from "../lib/logger";
import { ZendeskApiError } from "./types";

const MAX_RETRY_ATTEMPTS = 3;
const BASE_RETRY_DELAY_MS = 1000;

export type ZendeskClientConfig = {
  connectorId: string;
  accessToken: string;
  subdomain: string;
};

type ZendeskErrorBody = {
  error?: string;
  description?: string;
};

type CursorPaginatedResponse<T> = {
  meta: { has_more: boolean; after_cursor?: string };
  links: { next?: string };
} & T;

type IncrementalCursorResponse<T> = {
  after_cursor: string;
  end_of_stream: boolean;
  end_time: number;
  count: number;
} & T;

export type ZendeskClient = {
  readonly connectorId: string;
  readonly subdomain: string;
  get<T>(path: string, params?: Record<string, string>): Promise<T>;
  post<T>(path: string, body: unknown): Promise<T>;
  put<T>(path: string, body: unknown): Promise<T>;
  paginateAll<T>(
    path: string,
    params?: Record<string, string>
  ): AsyncGenerator<CursorPaginatedResponse<T>, void, undefined>;
  incrementalCursor<T>(
    path: string,
    params?: Record<string, string>
  ): AsyncGenerator<IncrementalCursorResponse<T>, void, undefined>;
};

export function createZendeskClient(
  config: ZendeskClientConfig
): ZendeskClient {
  const { connectorId, accessToken, subdomain } = config;
  const baseUrl = `https://${subdomain}.zendesk.com/api/v2`;

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
        ...init?.headers,
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
          "Zendesk API rate limited, retrying"
        );
        await new Promise((resolve) => setTimeout(resolve, retryAfter * 1000));
        return request<T>(url, init, attempt + 1);
      }
      throw new ZendeskApiError({
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
        .catch(() => ({}))) as ZendeskErrorBody;
      throw new ZendeskApiError({
        message: body.description ?? "Authentication failed",
        statusCode: response.status,
        code: response.status === 401 ? "UNAUTHORIZED" : "FORBIDDEN",
        retryable: false,
      });
    }

    if (!response.ok) {
      const body = (await response
        .json()
        .catch(() => ({}))) as ZendeskErrorBody;
      const retryable = response.status >= 500;
      if (retryable && attempt < MAX_RETRY_ATTEMPTS) {
        const delayMs =
          BASE_RETRY_DELAY_MS * 2 ** attempt +
          Math.random() * BASE_RETRY_DELAY_MS;
        logger.warn(
          { connectorId, url, statusCode: response.status, attempt },
          "Zendesk API server error, retrying"
        );
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        return request<T>(url, init, attempt + 1);
      }
      throw new ZendeskApiError({
        message: body.description ?? `Request failed: ${response.status}`,
        statusCode: response.status,
        code: body.error ?? "SERVER_ERROR",
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

  async function* paginateAll<T>(
    path: string,
    params?: Record<string, string>
  ): AsyncGenerator<CursorPaginatedResponse<T>, void, undefined> {
    let url = buildUrl(path, {
      ...params,
      "page[size]": params?.["page[size]"] ?? "100",
    });

    while (url) {
      const page = await request<CursorPaginatedResponse<T>>(url);
      yield page;

      if (page.meta.has_more && page.links.next) {
        url = page.links.next;
      } else {
        break;
      }
    }
  }

  async function* incrementalCursor<T>(
    path: string,
    params?: Record<string, string>
  ): AsyncGenerator<IncrementalCursorResponse<T>, void, undefined> {
    let url = buildUrl(path, params);

    while (url) {
      const page = await request<IncrementalCursorResponse<T>>(url);
      yield page;

      if (page.end_of_stream) {
        break;
      }

      url = buildUrl(path, {
        ...params,
        cursor: page.after_cursor,
      });
    }
  }

  return {
    connectorId,
    subdomain,
    get,
    post,
    put,
    paginateAll,
    incrementalCursor,
  };
}
