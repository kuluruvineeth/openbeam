import { logger } from "../lib/logger";
import { Dynamics365ApiError } from "./types";

const MAX_RETRY_ATTEMPTS = 3;
const BASE_RETRY_DELAY_MS = 1000;
const TRAILING_SLASHES = /\/+$/;

export type Dynamics365ClientConfig = {
  connectorId: string;
  accessToken: string;
  orgUrl: string;
};

type ODataListResponse<T> = {
  value: T[];
  "@odata.nextLink"?: string;
  "@odata.count"?: number;
};

type ODataErrorBody = {
  error?: {
    code?: string;
    message?: string;
  };
};

export type Dynamics365Client = {
  readonly connectorId: string;
  readonly orgUrl: string;
  get<T>(path: string, params?: Record<string, string>): Promise<T>;
  post<T>(path: string, body: unknown): Promise<T>;
  patch<T>(path: string, body: unknown): Promise<T>;
  del(path: string): Promise<void>;
  list<T>(
    path: string,
    params?: Record<string, string>,
    maxPageSize?: number
  ): Promise<ODataListResponse<T>>;
  listAll<T>(
    path: string,
    params?: Record<string, string>,
    maxPageSize?: number
  ): AsyncGenerator<T[], void, undefined>;
};

export function createDynamics365Client(
  config: Dynamics365ClientConfig
): Dynamics365Client {
  const { connectorId, accessToken, orgUrl } = config;
  const normalizedOrgUrl = orgUrl.replace(TRAILING_SLASHES, "");
  const baseUrl = `${normalizedOrgUrl}/api/data/v9.2`;

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
        "OData-MaxVersion": "4.0",
        "OData-Version": "4.0",
        Prefer: "odata.include-annotations=*",
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
          "Dynamics 365 API rate limited, retrying"
        );
        await new Promise((resolve) => setTimeout(resolve, retryAfter * 1000));
        return request<T>(url, init, attempt + 1);
      }
      throw new Dynamics365ApiError({
        message: "Rate limited",
        statusCode: 429,
        code: "RATE_LIMITED",
        retryable: true,
        retryAfter,
      });
    }

    if (response.status === 401 || response.status === 403) {
      const body = await parseErrorBody(response);
      throw new Dynamics365ApiError({
        message: body.error?.message ?? "Authentication failed",
        statusCode: response.status,
        code: response.status === 401 ? "UNAUTHORIZED" : "FORBIDDEN",
        retryable: false,
      });
    }

    if (response.status === 204) {
      return undefined as T;
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
          "Dynamics 365 API server error, retrying"
        );
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        return request<T>(url, init, attempt + 1);
      }
      throw new Dynamics365ApiError({
        message: body.error?.message ?? `Request failed: ${response.status}`,
        statusCode: response.status,
        code: "SERVER_ERROR",
        retryable,
      });
    }

    return response.json() as Promise<T>;
  }

  async function parseErrorBody(response: Response): Promise<ODataErrorBody> {
    return (await response.json().catch(() => ({}))) as ODataErrorBody;
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
      headers: { Prefer: "return=representation" },
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
    await request<undefined>(buildUrl(path), { method: "DELETE" });
  }

  function list<T>(
    path: string,
    params?: Record<string, string>,
    maxPageSize = 1000
  ): Promise<ODataListResponse<T>> {
    return request<ODataListResponse<T>>(buildUrl(path, params), {
      headers: {
        Prefer: `odata.maxpagesize=${maxPageSize},odata.include-annotations=*`,
      },
    });
  }

  async function* listAll<T>(
    path: string,
    params?: Record<string, string>,
    maxPageSize = 1000
  ): AsyncGenerator<T[], void, undefined> {
    let response = await list<T>(path, params, maxPageSize);
    const items = response.value ?? [];
    if (items.length > 0) {
      yield items;
    }

    while (response["@odata.nextLink"]) {
      response = await request<ODataListResponse<T>>(
        response["@odata.nextLink"],
        {
          headers: {
            Prefer: `odata.maxpagesize=${maxPageSize},odata.include-annotations=*`,
          },
        }
      );
      const nextItems = response.value ?? [];
      if (nextItems.length > 0) {
        yield nextItems;
      }
    }
  }

  return {
    connectorId,
    orgUrl: normalizedOrgUrl,
    get,
    post,
    patch,
    del,
    list,
    listAll,
  };
}
