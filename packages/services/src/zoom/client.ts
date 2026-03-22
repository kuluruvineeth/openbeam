import { ZOOM_API_BASE_URL } from "@openbeam/types/services/connectors/zoom";
import { logger } from "../lib/logger";
import { ZoomApiError } from "./types";

const MAX_RETRY_ATTEMPTS = 3;
const BASE_RETRY_DELAY_MS = 1000;

export type ZoomClientConfig = {
  connectorId: string;
  accessToken: string;
};

type ZoomErrorBody = {
  code?: number;
  message?: string;
};

type PageTokenResponse<T> = {
  next_page_token?: string;
  page_size?: number;
  total_records?: number;
} & T;

export type ZoomClient = {
  readonly connectorId: string;
  get<T>(path: string, params?: Record<string, string>): Promise<T>;
  post<T>(path: string, body: unknown): Promise<T>;
  patch<T>(path: string, body: unknown): Promise<T>;
  del(path: string): Promise<void>;
  paginate<T>(
    path: string,
    params?: Record<string, string>
  ): AsyncGenerator<PageTokenResponse<T>, void, undefined>;
  downloadText(url: string): Promise<string>;
};

export function createZoomClient(config: ZoomClientConfig): ZoomClient {
  const { connectorId, accessToken } = config;

  function buildUrl(path: string, params?: Record<string, string>): string {
    const url = new URL(`${ZOOM_API_BASE_URL}${path}`);
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
        response.headers.get("Retry-After") ?? "10",
        10
      );
      if (attempt < MAX_RETRY_ATTEMPTS) {
        logger.warn(
          { connectorId, url, retryAfter, attempt },
          "Zoom API rate limited, retrying"
        );
        await sleep(retryAfter * 1000);
        return request<T>(url, init, attempt + 1);
      }
      throw new ZoomApiError({
        message: "Rate limited",
        statusCode: 429,
        code: "RATE_LIMITED",
        retryable: true,
        retryAfter,
      });
    }

    if (response.status === 401 || response.status === 403) {
      const body = (await response.json().catch(() => ({}))) as ZoomErrorBody;
      throw new ZoomApiError({
        message: body.message ?? "Authentication failed",
        statusCode: response.status,
        code: response.status === 401 ? "UNAUTHORIZED" : "FORBIDDEN",
        retryable: false,
      });
    }

    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as ZoomErrorBody;
      const retryable = response.status >= 500;
      if (retryable && attempt < MAX_RETRY_ATTEMPTS) {
        const delayMs =
          BASE_RETRY_DELAY_MS * 2 ** attempt +
          Math.random() * BASE_RETRY_DELAY_MS;
        logger.warn(
          { connectorId, url, statusCode: response.status, attempt },
          "Zoom API server error, retrying"
        );
        await sleep(delayMs);
        return request<T>(url, init, attempt + 1);
      }
      throw new ZoomApiError({
        message: body.message ?? `Request failed: ${response.status}`,
        statusCode: response.status,
        code: String(body.code ?? "SERVER_ERROR"),
        retryable,
      });
    }

    if (response.status === 204) {
      return undefined as T;
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

  function patch<T>(path: string, body: unknown): Promise<T> {
    return request<T>(buildUrl(path), {
      method: "PATCH",
      body: JSON.stringify(body),
    });
  }

  async function del(path: string): Promise<void> {
    await request<void>(buildUrl(path), { method: "DELETE" });
  }

  async function* paginate<T>(
    path: string,
    params?: Record<string, string>
  ): AsyncGenerator<PageTokenResponse<T>, void, undefined> {
    let nextPageToken: string | undefined;

    while (true) {
      const queryParams = { ...params };
      if (nextPageToken) {
        queryParams.next_page_token = nextPageToken;
      }

      const page = await get<PageTokenResponse<T>>(path, queryParams);
      yield page;

      nextPageToken = page.next_page_token;
      if (!nextPageToken) {
        break;
      }
    }
  }

  async function downloadText(url: string): Promise<string> {
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      throw new ZoomApiError({
        message: `Download failed: ${response.status}`,
        statusCode: response.status,
        code: "DOWNLOAD_FAILED",
        retryable: response.status >= 500,
      });
    }

    return response.text();
  }

  return { connectorId, get, post, patch, del, paginate, downloadText };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
