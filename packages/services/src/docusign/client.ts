import { logger } from "../lib/logger";
import { DocuSignApiError } from "./types";

const MAX_RETRY_ATTEMPTS = 3;
const BASE_RETRY_DELAY_MS = 1000;

export type DocuSignClientConfig = {
  connectorId: string;
  accessToken: string;
  accountId: string;
  baseUri: string;
};

type DocuSignErrorBody = {
  errorCode?: string;
  message?: string;
};

export type DocuSignClient = {
  readonly connectorId: string;
  readonly accountId: string;
  readonly baseUri: string;
  get<T>(path: string, params?: Record<string, string>): Promise<T>;
  post<T>(path: string, body: unknown): Promise<T>;
  put<T>(path: string, body: unknown): Promise<T>;
};

export function createDocuSignClient(
  config: DocuSignClientConfig
): DocuSignClient {
  const { connectorId, accessToken, accountId, baseUri } = config;
  const baseUrl = `${baseUri}/restapi/v2.1/accounts/${accountId}`;

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
        response.headers.get("Retry-After") ?? "60",
        10
      );
      if (attempt < MAX_RETRY_ATTEMPTS) {
        logger.warn(
          { connectorId, url, retryAfter, attempt },
          "DocuSign API rate limited, retrying"
        );
        await new Promise((resolve) => setTimeout(resolve, retryAfter * 1000));
        return request<T>(url, init, attempt + 1);
      }
      throw new DocuSignApiError({
        message: "Rate limited",
        statusCode: 429,
        code: "RATE_LIMITED",
        retryable: true,
        retryAfter,
      });
    }

    if (response.status === 401 || response.status === 403) {
      const body = await parseErrorBody(response);
      throw new DocuSignApiError({
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
          "DocuSign API server error, retrying"
        );
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        return request<T>(url, init, attempt + 1);
      }
      throw new DocuSignApiError({
        message: body.message ?? `Request failed: ${response.status}`,
        statusCode: response.status,
        code: body.errorCode ?? "SERVER_ERROR",
        retryable,
      });
    }

    return response.json() as Promise<T>;
  }

  async function parseErrorBody(
    response: Response
  ): Promise<DocuSignErrorBody> {
    return (await response.json().catch(() => ({}))) as DocuSignErrorBody;
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

  return {
    connectorId,
    accountId,
    baseUri,
    get,
    post,
    put,
  };
}
