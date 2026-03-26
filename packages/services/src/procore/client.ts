import { logger } from "../lib/logger";
import { ProcoreApiError } from "./types";

const MAX_RETRY_ATTEMPTS = 3;
const BASE_RETRY_DELAY_MS = 1000;
const PROCORE_API_BASE = "https://api.procore.com/rest/v1.0";

export type ProcoreClientConfig = {
  connectorId: string;
  accessToken: string;
  companyId: string;
};

type ProcoreErrorBody = {
  message?: string;
  errors?: string[];
};

export type ProcoreClient = {
  readonly connectorId: string;
  readonly companyId: string;
  get<T>(path: string, params?: Record<string, string>): Promise<T>;
  post<T>(path: string, body: unknown): Promise<T>;
  patch<T>(path: string, body: unknown): Promise<T>;
  listAll<T>(
    path: string,
    params?: Record<string, string>,
    perPage?: number
  ): AsyncGenerator<T[], void, undefined>;
};

export function createProcoreClient(
  config: ProcoreClientConfig
): ProcoreClient {
  const { connectorId, accessToken, companyId } = config;

  async function request<T>(
    url: string,
    init?: RequestInit,
    attempt = 0
  ): Promise<T> {
    const response = await fetch(url, {
      ...init,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Procore-Company-Id": companyId,
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
          "Procore API rate limited, retrying"
        );
        await new Promise((resolve) => setTimeout(resolve, retryAfter * 1000));
        return request<T>(url, init, attempt + 1);
      }
      throw new ProcoreApiError({
        message: "Rate limited",
        statusCode: 429,
        code: "RATE_LIMITED",
        retryable: true,
        retryAfter,
      });
    }

    if (response.status === 401 || response.status === 403) {
      const body = await parseErrorBody(response);
      throw new ProcoreApiError({
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
          "Procore API server error, retrying"
        );
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        return request<T>(url, init, attempt + 1);
      }
      throw new ProcoreApiError({
        message: body.message ?? `Request failed: ${response.status}`,
        statusCode: response.status,
        code: "SERVER_ERROR",
        retryable,
      });
    }

    return response.json() as Promise<T>;
  }

  async function parseErrorBody(response: Response): Promise<ProcoreErrorBody> {
    return (await response.json().catch(() => ({}))) as ProcoreErrorBody;
  }

  function buildUrl(path: string, params?: Record<string, string>): string {
    const url = new URL(`${PROCORE_API_BASE}${path}`);
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

  async function* listAll<T>(
    path: string,
    params?: Record<string, string>,
    perPage = 100
  ): AsyncGenerator<T[], void, undefined> {
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const data = await get<T[]>(path, {
        ...params,
        page: String(page),
        per_page: String(perPage),
      });

      if (data.length > 0) {
        yield data;
      }

      hasMore = data.length >= perPage;
      page += 1;
    }
  }

  return {
    connectorId,
    companyId,
    get,
    post,
    patch,
    listAll,
  };
}
