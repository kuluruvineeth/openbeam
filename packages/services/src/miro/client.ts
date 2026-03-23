import { logger } from "../lib/logger";
import { MiroApiError } from "./types";

const MAX_RETRY_ATTEMPTS = 3;
const BASE_RETRY_DELAY_MS = 1000;

export type MiroClientConfig = {
  connectorId: string;
  accessToken: string;
};

type MiroListResponse<T> = {
  data: T[];
  total?: number;
  size?: number;
  offset?: number;
  limit?: number;
  cursor?: string;
};

type MiroErrorBody = {
  status?: number;
  code?: string;
  message?: string;
  type?: string;
};

export type MiroClient = {
  readonly connectorId: string;
  get<T>(path: string, params?: Record<string, string>): Promise<T>;
  post<T>(path: string, body: unknown): Promise<T>;
  patch<T>(path: string, body: unknown): Promise<T>;
  del(path: string): Promise<void>;
  listAll<T>(
    path: string,
    params?: Record<string, string>,
    limit?: number
  ): AsyncGenerator<T[], void, undefined>;
};

export function createMiroClient(config: MiroClientConfig): MiroClient {
  const { connectorId, accessToken } = config;
  const baseUrl = "https://api.miro.com/v2";

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
          "Miro API rate limited, retrying"
        );
        await new Promise((resolve) => setTimeout(resolve, retryAfter * 1000));
        return request<T>(url, init, attempt + 1);
      }
      throw new MiroApiError({
        message: "Rate limited",
        statusCode: 429,
        code: "RATE_LIMITED",
        retryable: true,
        retryAfter,
      });
    }

    if (response.status === 401 || response.status === 403) {
      const body = await parseErrorBody(response);
      throw new MiroApiError({
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
          "Miro API server error, retrying"
        );
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        return request<T>(url, init, attempt + 1);
      }
      throw new MiroApiError({
        message: body.message ?? `Request failed: ${response.status}`,
        statusCode: response.status,
        code: "SERVER_ERROR",
        retryable,
      });
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return response.json() as Promise<T>;
  }

  async function parseErrorBody(response: Response): Promise<MiroErrorBody> {
    return (await response.json().catch(() => ({}))) as MiroErrorBody;
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

  async function del(path: string): Promise<void> {
    await request<void>(buildUrl(path), { method: "DELETE" });
  }

  async function* listAll<T>(
    path: string,
    params?: Record<string, string>,
    limit = 50
  ): AsyncGenerator<T[], void, undefined> {
    let cursor: string | undefined;

    while (true) {
      const queryParams: Record<string, string> = {
        ...params,
        limit: String(limit),
      };
      if (cursor) {
        queryParams.cursor = cursor;
      }

      const response = await get<MiroListResponse<T>>(path, queryParams);
      const data = response.data ?? [];
      if (data.length > 0) {
        yield data;
      }

      cursor = response.cursor;
      if (!cursor || data.length < limit) {
        break;
      }
    }
  }

  return {
    connectorId,
    get,
    post,
    patch,
    del,
    listAll,
  };
}
