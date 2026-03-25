import { logger } from "../lib/logger";
import { PanoptoApiError } from "./types";

const MAX_RETRY_ATTEMPTS = 3;
const BASE_RETRY_DELAY_MS = 1000;

export type PanoptoClientConfig = {
  connectorId: string;
  accessToken: string;
  instanceUrl: string;
};

type PanoptoListResponse<T> = {
  Results: T[];
  TotalResultCount?: number;
};

type PanoptoErrorBody = {
  ErrorCode?: string;
  ErrorMessage?: string;
};

export type PanoptoClient = {
  readonly connectorId: string;
  readonly instanceUrl: string;
  get<T>(path: string, params?: Record<string, string>): Promise<T>;
  post<T>(path: string, body: unknown): Promise<T>;
  put<T>(path: string, body: unknown): Promise<T>;
  list<T>(
    path: string,
    params?: Record<string, string>,
    pageNumber?: number,
    maxResults?: number
  ): Promise<PanoptoListResponse<T>>;
  listAll<T>(
    path: string,
    params?: Record<string, string>,
    maxResults?: number
  ): AsyncGenerator<T[], void, undefined>;
};

export function createPanoptoClient(
  config: PanoptoClientConfig
): PanoptoClient {
  const { connectorId, accessToken, instanceUrl } = config;
  const baseUrl = `${instanceUrl}/Panopto/api/v1`;

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
          "Panopto API rate limited, retrying"
        );
        await new Promise((resolve) => setTimeout(resolve, retryAfter * 1000));
        return request<T>(url, init, attempt + 1);
      }
      throw new PanoptoApiError({
        message: "Rate limited",
        statusCode: 429,
        code: "RATE_LIMITED",
        retryable: true,
        retryAfter,
      });
    }

    if (response.status === 401 || response.status === 403) {
      const body = await parseErrorBody(response);
      throw new PanoptoApiError({
        message: body.ErrorMessage ?? "Authentication failed",
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
          "Panopto API server error, retrying"
        );
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        return request<T>(url, init, attempt + 1);
      }
      throw new PanoptoApiError({
        message: body.ErrorMessage ?? `Request failed: ${response.status}`,
        statusCode: response.status,
        code: "SERVER_ERROR",
        retryable,
      });
    }

    return response.json() as Promise<T>;
  }

  async function parseErrorBody(response: Response): Promise<PanoptoErrorBody> {
    return (await response.json().catch(() => ({}))) as PanoptoErrorBody;
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

  function put<T>(path: string, body: unknown): Promise<T> {
    return request<T>(buildUrl(path), {
      method: "PUT",
      body: JSON.stringify(body),
    });
  }

  function list<T>(
    path: string,
    params?: Record<string, string>,
    pageNumber = 0,
    maxResults = 50
  ): Promise<PanoptoListResponse<T>> {
    const mergedParams = {
      ...params,
      pageNumber: String(pageNumber),
      maxResults: String(maxResults),
    };
    return get<PanoptoListResponse<T>>(path, mergedParams);
  }

  async function* listAll<T>(
    path: string,
    params?: Record<string, string>,
    maxResults = 50
  ): AsyncGenerator<T[], void, undefined> {
    let pageNumber = 0;
    let hasMore = true;

    while (hasMore) {
      const response = await list<T>(path, params, pageNumber, maxResults);
      const data = response.Results ?? [];
      if (data.length > 0) {
        yield data;
      }
      hasMore = data.length >= maxResults;
      pageNumber += 1;
    }
  }

  return {
    connectorId,
    instanceUrl,
    get,
    post,
    put,
    list,
    listAll,
  };
}
