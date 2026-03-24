import { logger } from "../lib/logger";
import { CanvaApiError } from "./types";

const MAX_RETRY_ATTEMPTS = 3;
const BASE_RETRY_DELAY_MS = 1000;
const BASE_URL = "https://api.canva.com/rest/v1";

export type CanvaClientConfig = {
  connectorId: string;
  accessToken: string;
};

type CanvaListResponse<T> = {
  items: T[];
  continuation?: string;
};

type CanvaErrorBody = {
  code?: string;
  message?: string;
};

export type CanvaClient = {
  readonly connectorId: string;
  get<T>(path: string, params?: Record<string, string>): Promise<T>;
  post<T>(path: string, body: unknown): Promise<T>;
  list<T>(
    path: string,
    params?: Record<string, string>
  ): Promise<CanvaListResponse<T>>;
  listAll<T>(
    path: string,
    params?: Record<string, string>
  ): AsyncGenerator<T[], void, undefined>;
};

export function createCanvaClient(config: CanvaClientConfig): CanvaClient {
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
          "Canva API rate limited, retrying"
        );
        await new Promise((resolve) => setTimeout(resolve, retryAfter * 1000));
        return request<T>(url, init, attempt + 1);
      }
      throw new CanvaApiError({
        message: "Rate limited",
        statusCode: 429,
        code: "RATE_LIMITED",
        retryable: true,
        retryAfter,
      });
    }

    if (response.status === 401 || response.status === 403) {
      const body = await parseErrorBody(response);
      throw new CanvaApiError({
        message: body.message ?? "Authentication failed",
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
          "Canva API server error, retrying"
        );
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        return request<T>(url, init, attempt + 1);
      }
      throw new CanvaApiError({
        message: body.message ?? `Request failed: ${response.status}`,
        statusCode: response.status,
        code: "SERVER_ERROR",
        retryable,
      });
    }

    return response.json() as Promise<T>;
  }

  async function parseErrorBody(response: Response): Promise<CanvaErrorBody> {
    return (await response.json().catch(() => ({}))) as CanvaErrorBody;
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

  function list<T>(
    path: string,
    params?: Record<string, string>
  ): Promise<CanvaListResponse<T>> {
    return get<CanvaListResponse<T>>(path, params);
  }

  async function* listAll<T>(
    path: string,
    params?: Record<string, string>
  ): AsyncGenerator<T[], void, undefined> {
    let continuation: string | undefined;

    do {
      const mergedParams = { ...params };
      if (continuation) {
        mergedParams.continuation = continuation;
      }

      const response = await list<T>(path, mergedParams);
      const items = response.items ?? [];
      if (items.length > 0) {
        yield items;
      }
      continuation = response.continuation;
    } while (continuation);
  }

  return {
    connectorId,
    get,
    post,
    list,
    listAll,
  };
}
