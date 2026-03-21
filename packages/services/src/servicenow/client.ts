import { logger } from "../lib/logger";
import { ServiceNowApiError } from "./types";

const MAX_RETRY_ATTEMPTS = 3;
const BASE_RETRY_DELAY_MS = 1000;

export type ServiceNowClientConfig = {
  connectorId: string;
  accessToken: string;
  instance: string;
};

type ServiceNowErrorBody = {
  error?: { message?: string; detail?: string };
};

type TableResponse<T> = {
  result: T[];
};

export type ServiceNowClient = {
  readonly connectorId: string;
  readonly instance: string;
  get<T>(path: string, params?: Record<string, string>): Promise<T>;
  post<T>(path: string, body: unknown): Promise<T>;
  patch<T>(path: string, body: unknown): Promise<T>;
  paginateTable<T>(
    tableName: string,
    params?: Record<string, string>
  ): AsyncGenerator<T[], void, undefined>;
};

export function createServiceNowClient(
  config: ServiceNowClientConfig
): ServiceNowClient {
  const { connectorId, accessToken, instance } = config;
  const baseUrl = `https://${instance}.service-now.com/api/now`;

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
          "ServiceNow API rate limited, retrying"
        );
        await new Promise((resolve) => setTimeout(resolve, retryAfter * 1000));
        return request<T>(url, init, attempt + 1);
      }
      throw new ServiceNowApiError({
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
        .catch(() => ({}))) as ServiceNowErrorBody;
      throw new ServiceNowApiError({
        message: body.error?.message ?? "Authentication failed",
        statusCode: response.status,
        code: response.status === 401 ? "UNAUTHORIZED" : "FORBIDDEN",
        retryable: false,
      });
    }

    if (!response.ok) {
      const body = (await response
        .json()
        .catch(() => ({}))) as ServiceNowErrorBody;
      const retryable = response.status >= 500;
      if (retryable && attempt < MAX_RETRY_ATTEMPTS) {
        const delayMs =
          BASE_RETRY_DELAY_MS * 2 ** attempt +
          Math.random() * BASE_RETRY_DELAY_MS;
        logger.warn(
          { connectorId, url, statusCode: response.status, attempt },
          "ServiceNow API server error, retrying"
        );
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        return request<T>(url, init, attempt + 1);
      }
      throw new ServiceNowApiError({
        message: body.error?.message ?? `Request failed: ${response.status}`,
        statusCode: response.status,
        code: "SERVER_ERROR",
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

  function patch<T>(path: string, body: unknown): Promise<T> {
    return request<T>(buildUrl(path), {
      method: "PATCH",
      body: JSON.stringify(body),
    });
  }

  async function* paginateTable<T>(
    tableName: string,
    params?: Record<string, string>
  ): AsyncGenerator<T[], void, undefined> {
    const limit = params?.sysparm_limit ?? "100";
    let offset = 0;

    while (true) {
      const page = await get<TableResponse<T>>(`/table/${tableName}`, {
        ...params,
        sysparm_limit: limit,
        sysparm_offset: String(offset),
      });

      if (page.result.length > 0) {
        yield page.result;
      }

      if (page.result.length < Number.parseInt(limit, 10)) {
        break;
      }

      offset += page.result.length;
    }
  }

  return {
    connectorId,
    instance,
    get,
    post,
    patch,
    paginateTable,
  };
}
