import { logger } from "../lib/logger";
import { SalesforceApiError } from "./types";

const API_VERSION = "v62.0";
const MAX_RETRY_ATTEMPTS = 3;
const BASE_RETRY_DELAY_MS = 1000;

export type SalesforceClientConfig = {
  connectorId: string;
  accessToken: string;
  instanceUrl: string;
};

type SalesforceErrorBody = {
  message?: string;
  errorCode?: string;
  fields?: string[];
};

type SoqlQueryResponse<T> = {
  totalSize: number;
  done: boolean;
  nextRecordsUrl?: string;
  records: T[];
};

type DeletedRecordsResponse = {
  deletedRecords: Array<{ id: string; deletedDate: string }>;
  earliestDateAvailable: string;
  latestDateCovered: string;
};

export type SalesforceClient = {
  readonly connectorId: string;
  readonly instanceUrl: string;
  get<T>(path: string, params?: Record<string, string>): Promise<T>;
  query<T>(soql: string): Promise<SoqlQueryResponse<T>>;
  queryAll<T>(soql: string): AsyncGenerator<T[], void, undefined>;
  post<T>(path: string, body: unknown): Promise<T>;
  patch(path: string, body: unknown): Promise<void>;
  getDeleted(
    sobject: string,
    start: string,
    end: string
  ): Promise<DeletedRecordsResponse>;
};

export function createSalesforceClient(
  config: SalesforceClientConfig
): SalesforceClient {
  const { connectorId, accessToken, instanceUrl } = config;
  const baseUrl = `${instanceUrl}/services/data/${API_VERSION}`;

  function buildUrl(path: string, params?: Record<string, string>): string {
    const url = new URL(`${baseUrl}${path}`);
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        url.searchParams.set(key, value);
      }
    }
    return url.toString();
  }

  async function request<T>(url: string, attempt = 0): Promise<T> {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
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
          "Salesforce API rate limited, retrying"
        );
        await new Promise((resolve) => setTimeout(resolve, retryAfter * 1000));
        return request<T>(url, attempt + 1);
      }
      throw new SalesforceApiError({
        message: "Rate limited",
        statusCode: 429,
        code: "REQUEST_LIMIT_EXCEEDED",
        retryable: true,
        retryAfter,
      });
    }

    if (response.status === 401 || response.status === 403) {
      const body = (await response
        .json()
        .catch(() => [{}])) as SalesforceErrorBody[];
      const err = body[0] ?? {};
      throw new SalesforceApiError({
        message: err.message ?? "Authentication failed",
        statusCode: response.status,
        code: err.errorCode ?? "INVALID_SESSION_ID",
        retryable: false,
      });
    }

    if (!response.ok) {
      const body = (await response
        .json()
        .catch(() => [{}])) as SalesforceErrorBody[];
      const err = body[0] ?? {};
      const retryable = response.status >= 500;
      if (retryable && attempt < MAX_RETRY_ATTEMPTS) {
        const delayMs =
          BASE_RETRY_DELAY_MS * 2 ** attempt +
          Math.random() * BASE_RETRY_DELAY_MS;
        logger.warn(
          { connectorId, url, statusCode: response.status, attempt },
          "Salesforce API server error, retrying"
        );
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        return request<T>(url, attempt + 1);
      }
      throw new SalesforceApiError({
        message: err.message ?? `Request failed: ${response.status}`,
        statusCode: response.status,
        code: err.errorCode ?? "SERVER_ERROR",
        retryable,
      });
    }

    return response.json() as Promise<T>;
  }

  function get<T>(path: string, params?: Record<string, string>): Promise<T> {
    return request<T>(buildUrl(path, params));
  }

  function query<T>(soql: string): Promise<SoqlQueryResponse<T>> {
    return request<SoqlQueryResponse<T>>(buildUrl("/query", { q: soql }));
  }

  async function* queryAll<T>(
    soql: string
  ): AsyncGenerator<T[], void, undefined> {
    let result = await query<T>(soql);

    if (result.records.length > 0) {
      yield result.records;
    }

    while (!result.done && result.nextRecordsUrl) {
      const nextUrl = result.nextRecordsUrl.startsWith("http")
        ? result.nextRecordsUrl
        : `${instanceUrl}${result.nextRecordsUrl}`;
      result = await request<SoqlQueryResponse<T>>(nextUrl);

      if (result.records.length > 0) {
        yield result.records;
      }
    }
  }

  function post<T>(path: string, body: unknown): Promise<T> {
    return request<T>(buildUrl(path), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  async function patch(path: string, body: unknown): Promise<void> {
    const url = buildUrl(path);
    const response = await fetch(url, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const errBody = (await response.json().catch(() => [{}])) as Array<{
        message?: string;
        errorCode?: string;
      }>;
      const err = errBody[0] ?? {};
      throw new SalesforceApiError({
        message: err.message ?? `PATCH failed: ${response.status}`,
        statusCode: response.status,
        code: err.errorCode ?? "UPDATE_FAILED",
        retryable: response.status >= 500,
      });
    }
  }

  function getDeleted(
    sobject: string,
    start: string,
    end: string
  ): Promise<DeletedRecordsResponse> {
    return request<DeletedRecordsResponse>(
      buildUrl(`/sobjects/${sobject}/deleted`, { start, end })
    );
  }

  return {
    connectorId,
    instanceUrl,
    get,
    post,
    patch,
    query,
    queryAll,
    getDeleted,
  };
}
