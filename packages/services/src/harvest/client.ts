import { logger } from "../lib/logger";
import { HarvestApiError } from "./types";

const MAX_RETRY_ATTEMPTS = 3;
const BASE_RETRY_DELAY_MS = 1000;

export type HarvestClientConfig = {
  connectorId: string;
  accessToken: string;
  accountId: string;
};

type HarvestPaginatedResponse<T> = {
  page: number;
  total_pages: number;
  total_entries: number;
  next_page: number | null;
  per_page: number;
} & Record<string, T[] | number | null>;

type HarvestErrorBody = {
  error?: string;
  error_description?: string;
};

export type HarvestClient = {
  readonly connectorId: string;
  readonly accountId: string;
  get<T>(path: string, params?: Record<string, string>): Promise<T>;
  post<T>(path: string, body: unknown): Promise<T>;
  patch<T>(path: string, body: unknown): Promise<T>;
  paginate<T>(
    path: string,
    dataKey: string,
    params?: Record<string, string>
  ): AsyncGenerator<T[], void, undefined>;
};

export function createHarvestClient(
  config: HarvestClientConfig
): HarvestClient {
  const { connectorId, accessToken, accountId } = config;
  const baseUrl = "https://api.harvestapp.com/v2";

  async function request<T>(
    url: string,
    init?: RequestInit,
    attempt = 0
  ): Promise<T> {
    const response = await fetch(url, {
      ...init,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Harvest-Account-Id": accountId,
        Accept: "application/json",
        "Content-Type": "application/json",
        "User-Agent": "OpenBeam Connector (support@openbeam.dev)",
        ...(init?.headers as Record<string, string>),
      },
    });

    if (response.status === 429) {
      const retryAfter = Number.parseInt(
        response.headers.get("Retry-After") ?? "15",
        10
      );
      if (attempt < MAX_RETRY_ATTEMPTS) {
        logger.warn(
          { connectorId, url, retryAfter, attempt },
          "Harvest API rate limited, retrying"
        );
        await new Promise((resolve) => setTimeout(resolve, retryAfter * 1000));
        return request<T>(url, init, attempt + 1);
      }
      throw new HarvestApiError({
        message: "Rate limited",
        statusCode: 429,
        code: "RATE_LIMITED",
        retryable: true,
        retryAfter,
      });
    }

    if (response.status === 401 || response.status === 403) {
      const body = await parseErrorBody(response);
      throw new HarvestApiError({
        message: body.error ?? "Authentication failed",
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
          "Harvest API server error, retrying"
        );
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        return request<T>(url, init, attempt + 1);
      }
      throw new HarvestApiError({
        message: body.error ?? `Request failed: ${response.status}`,
        statusCode: response.status,
        code: "SERVER_ERROR",
        retryable,
      });
    }

    return response.json() as Promise<T>;
  }

  async function parseErrorBody(response: Response): Promise<HarvestErrorBody> {
    return (await response.json().catch(() => ({}))) as HarvestErrorBody;
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

  async function* paginate<T>(
    path: string,
    dataKey: string,
    params?: Record<string, string>
  ): AsyncGenerator<T[], void, undefined> {
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const response = await get<HarvestPaginatedResponse<T>>(path, {
        ...params,
        page: String(page),
        per_page: "100",
      });

      const data = (response[dataKey] as T[]) ?? [];
      if (data.length > 0) {
        yield data;
      }

      hasMore = response.next_page !== null;
      page += 1;
    }
  }

  return {
    connectorId,
    accountId,
    get,
    post,
    patch,
    paginate,
  };
}
