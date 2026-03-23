import { logger } from "../lib/logger";
import { AirtableApiError } from "./types";

const MAX_RETRY_ATTEMPTS = 3;
const BASE_RETRY_DELAY_MS = 1000;

export type AirtableClientConfig = {
  connectorId: string;
  accessToken: string;
};

type AirtableErrorBody = {
  error?: {
    type?: string;
    message?: string;
  };
};

type AirtableListResponse<T> = {
  records?: T[];
  offset?: string;
};

export type AirtableClient = {
  readonly connectorId: string;
  get<T>(path: string, params?: Record<string, string>): Promise<T>;
  post<T>(path: string, body: unknown): Promise<T>;
  patch<T>(path: string, body: unknown): Promise<T>;
  del<T>(path: string): Promise<T>;
  listRecords<T>(
    baseId: string,
    tableIdOrName: string,
    params?: Record<string, string>
  ): Promise<AirtableListResponse<T>>;
  listAllRecords<T>(
    baseId: string,
    tableIdOrName: string,
    params?: Record<string, string>
  ): AsyncGenerator<T[], void, undefined>;
};

export function createAirtableClient(
  config: AirtableClientConfig
): AirtableClient {
  const { connectorId, accessToken } = config;
  const baseUrl = "https://api.airtable.com/v0";

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
        response.headers.get("Retry-After") ?? "30",
        10
      );
      if (attempt < MAX_RETRY_ATTEMPTS) {
        logger.warn(
          { connectorId, url, retryAfter, attempt },
          "Airtable API rate limited, retrying"
        );
        await new Promise((resolve) => setTimeout(resolve, retryAfter * 1000));
        return request<T>(url, init, attempt + 1);
      }
      throw new AirtableApiError({
        message: "Rate limited",
        statusCode: 429,
        code: "RATE_LIMITED",
        retryable: true,
        retryAfter,
      });
    }

    if (response.status === 401 || response.status === 403) {
      const body = await parseErrorBody(response);
      throw new AirtableApiError({
        message: body.error?.message ?? "Authentication failed",
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
          "Airtable API server error, retrying"
        );
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        return request<T>(url, init, attempt + 1);
      }
      throw new AirtableApiError({
        message: body.error?.message ?? `Request failed: ${response.status}`,
        statusCode: response.status,
        code: "SERVER_ERROR",
        retryable,
      });
    }

    return response.json() as Promise<T>;
  }

  async function parseErrorBody(
    response: Response
  ): Promise<AirtableErrorBody> {
    return (await response.json().catch(() => ({}))) as AirtableErrorBody;
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

  function del<T>(path: string): Promise<T> {
    return request<T>(buildUrl(path), { method: "DELETE" });
  }

  function listRecords<T>(
    baseId: string,
    tableIdOrName: string,
    params?: Record<string, string>
  ): Promise<AirtableListResponse<T>> {
    return get<AirtableListResponse<T>>(
      `/${baseId}/${encodeURIComponent(tableIdOrName)}`,
      params
    );
  }

  async function* listAllRecords<T>(
    baseId: string,
    tableIdOrName: string,
    params?: Record<string, string>
  ): AsyncGenerator<T[], void, undefined> {
    let offset: string | undefined;

    do {
      const mergedParams: Record<string, string> = {
        ...params,
        pageSize: "100",
      };
      if (offset) {
        mergedParams.offset = offset;
      }
      const response = await listRecords<T>(
        baseId,
        tableIdOrName,
        mergedParams
      );
      const records = response.records ?? [];
      if (records.length > 0) {
        yield records;
      }
      offset = response.offset;
    } while (offset);
  }

  return {
    connectorId,
    get,
    post,
    patch,
    del,
    listRecords,
    listAllRecords,
  };
}
