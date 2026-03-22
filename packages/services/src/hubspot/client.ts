import { logger } from "../lib/logger";
import { HubSpotApiError } from "./types";

const BASE_URL = "https://api.hubapi.com";
const MAX_RETRY_ATTEMPTS = 3;
const BASE_RETRY_DELAY_MS = 1000;

export type HubSpotClientConfig = {
  connectorId: string;
  accessToken: string;
  portalId: string;
};

type CrmListResponse<T> = {
  results: T[];
  paging?: { next?: { after: string } };
};

type CrmSearchResponse<T> = {
  total: number;
  results: T[];
  paging?: { next?: { after: string } };
};

type HubSpotErrorBody = {
  message?: string;
  category?: string;
  status?: string;
  correlationId?: string;
};

export type HubSpotClient = {
  readonly connectorId: string;
  readonly portalId: string;
  get<T>(path: string, params?: Record<string, string>): Promise<T>;
  post<T>(path: string, body: unknown): Promise<T>;
  patch(path: string, body: unknown): Promise<void>;
  listObjects<T>(
    objectType: string,
    properties: string[],
    after?: string,
    limit?: number
  ): Promise<CrmListResponse<T>>;
  searchObjects<T>(
    objectType: string,
    properties: string[],
    options?: SearchOptions
  ): Promise<CrmSearchResponse<T>>;
  listAll<T>(
    objectType: string,
    properties: string[],
    limit?: number
  ): AsyncGenerator<T[], void, undefined>;
  searchAll<T>(
    objectType: string,
    properties: string[],
    options?: SearchOptions
  ): AsyncGenerator<T[], void, undefined>;
};

export type SearchOptions = {
  filterGroups?: unknown[];
  sorts?: unknown[];
  after?: string;
  limit?: number;
};

export function createHubSpotClient(
  config: HubSpotClientConfig
): HubSpotClient {
  const { connectorId, accessToken, portalId } = config;

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
          "HubSpot API rate limited, retrying"
        );
        await new Promise((resolve) => setTimeout(resolve, retryAfter * 1000));
        return request<T>(url, init, attempt + 1);
      }
      throw new HubSpotApiError({
        message: "Rate limited",
        statusCode: 429,
        code: "RATE_LIMITED",
        retryable: true,
        retryAfter,
      });
    }

    if (response.status === 401 || response.status === 403) {
      const body = await parseErrorBody(response);
      throw new HubSpotApiError({
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
          "HubSpot API server error, retrying"
        );
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        return request<T>(url, init, attempt + 1);
      }
      throw new HubSpotApiError({
        message: body.message ?? `Request failed: ${response.status}`,
        statusCode: response.status,
        code: body.category ?? "SERVER_ERROR",
        retryable,
      });
    }

    return response.json() as Promise<T>;
  }

  async function parseErrorBody(response: Response): Promise<HubSpotErrorBody> {
    return (await response.json().catch(() => ({}))) as HubSpotErrorBody;
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

  async function patch(path: string, body: unknown): Promise<void> {
    await request<unknown>(buildUrl(path), {
      method: "PATCH",
      body: JSON.stringify(body),
    });
  }

  function listObjects<T>(
    objectType: string,
    properties: string[],
    after?: string,
    limit = 100
  ): Promise<CrmListResponse<T>> {
    const params: Record<string, string> = {
      limit: String(limit),
      properties: properties.join(","),
    };
    if (after) {
      params.after = after;
    }
    return get<CrmListResponse<T>>(`/crm/v3/objects/${objectType}`, params);
  }

  function searchObjects<T>(
    objectType: string,
    properties: string[],
    options: SearchOptions = {}
  ): Promise<CrmSearchResponse<T>> {
    const { filterGroups, sorts, after, limit = 100 } = options;
    const body: Record<string, unknown> = {
      limit,
      properties,
    };
    if (filterGroups) {
      body.filterGroups = filterGroups;
    }
    if (sorts) {
      body.sorts = sorts;
    }
    if (after) {
      body.after = after;
    }
    return post<CrmSearchResponse<T>>(
      `/crm/v3/objects/${objectType}/search`,
      body
    );
  }

  async function* listAll<T>(
    objectType: string,
    properties: string[],
    limit = 100
  ): AsyncGenerator<T[], void, undefined> {
    let after: string | undefined;
    do {
      const response = await listObjects<T>(
        objectType,
        properties,
        after,
        limit
      );
      if (response.results.length > 0) {
        yield response.results;
      }
      after = response.paging?.next?.after;
    } while (after);
  }

  async function* searchAll<T>(
    objectType: string,
    properties: string[],
    options: SearchOptions = {}
  ): AsyncGenerator<T[], void, undefined> {
    let after: string | undefined;
    do {
      const response = await searchObjects<T>(objectType, properties, {
        ...options,
        after,
      });
      if (response.results.length > 0) {
        yield response.results;
      }
      after = response.paging?.next?.after;
    } while (after);
  }

  return {
    connectorId,
    portalId,
    get,
    post,
    patch,
    listObjects,
    searchObjects,
    listAll,
    searchAll,
  };
}
