import { logger } from "../lib/logger";
import { AtlassianApiError } from "./types";

const MAX_RETRY_ATTEMPTS = 3;
const BASE_RETRY_DELAY_MS = 1000;

export type AtlassianClientConfig = {
  connectorId: string;
  accessToken: string;
  cloudId: string;
  product: "confluence" | "jira";
};

type AtlassianErrorBody = {
  message?: string;
  errorMessages?: string[];
  errors?: Record<string, string>;
};

export type AtlassianClient = {
  readonly connectorId: string;
  readonly cloudId: string;
  get<T>(path: string, params?: Record<string, string>): Promise<T>;
  post<T>(path: string, body?: unknown): Promise<T>;
  del(path: string): Promise<void>;
  paginate<T>(
    path: string,
    params?: Record<string, string>,
    options?: { pageSize?: number }
  ): AsyncGenerator<T[], void, undefined>;
};

function getBaseUrl(product: "confluence" | "jira", cloudId: string): string {
  if (product === "confluence") {
    return `https://api.atlassian.com/ex/confluence/${cloudId}`;
  }
  return `https://api.atlassian.com/ex/jira/${cloudId}`;
}

export function createAtlassianClient(
  config: AtlassianClientConfig
): AtlassianClient {
  const { connectorId, accessToken, cloudId, product } = config;
  const baseUrl = getBaseUrl(product, cloudId);

  function buildUrl(path: string, params?: Record<string, string>): string {
    const url = new URL(`${baseUrl}${path}`);
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        url.searchParams.set(key, value);
      }
    }
    return url.toString();
  }

  function extractErrorMessage(body: AtlassianErrorBody): string {
    if (body.message) {
      return body.message;
    }
    if (body.errorMessages?.length) {
      return body.errorMessages.join("; ");
    }
    if (body.errors) {
      return Object.values(body.errors).join("; ");
    }
    return "Unknown error";
  }

  async function request<T>(
    url: string,
    options: RequestInit = {},
    attempt = 0
  ): Promise<T> {
    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    if (response.status === 429) {
      const retryAfter = Number.parseInt(
        response.headers.get("Retry-After") ?? "60",
        10
      );
      if (attempt < MAX_RETRY_ATTEMPTS) {
        const delayMs = retryAfter * 1000;
        logger.warn(
          { connectorId, url, retryAfter, attempt },
          "Atlassian API rate limited, retrying"
        );
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        return request<T>(url, options, attempt + 1);
      }
      throw new AtlassianApiError({
        message: "Rate limited",
        statusCode: 429,
        code: "TooManyRequests",
        retryable: true,
        retryAfter,
      });
    }

    if (response.status === 401 || response.status === 403) {
      const body = (await response
        .json()
        .catch(() => ({}))) as AtlassianErrorBody;
      throw new AtlassianApiError({
        message: extractErrorMessage(body) || "Authentication failed",
        statusCode: response.status,
        code: response.status === 401 ? "UNAUTHORIZED" : "FORBIDDEN",
        retryable: false,
      });
    }

    if (!response.ok) {
      const body = (await response
        .json()
        .catch(() => ({}))) as AtlassianErrorBody;
      const retryable = response.status >= 500;
      if (retryable && attempt < MAX_RETRY_ATTEMPTS) {
        const delayMs =
          BASE_RETRY_DELAY_MS * 2 ** attempt +
          Math.random() * BASE_RETRY_DELAY_MS;
        logger.warn(
          { connectorId, url, statusCode: response.status, attempt },
          "Atlassian API server error, retrying"
        );
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        return request<T>(url, options, attempt + 1);
      }
      throw new AtlassianApiError({
        message:
          extractErrorMessage(body) || `Request failed: ${response.status}`,
        statusCode: response.status,
        code: "ServerError",
        retryable,
      });
    }

    return response.json() as Promise<T>;
  }

  function get<T>(path: string, params?: Record<string, string>): Promise<T> {
    return request<T>(buildUrl(path, params));
  }

  function post<T>(path: string, body?: unknown): Promise<T> {
    return request<T>(buildUrl(path), {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async function del(path: string): Promise<void> {
    await request<unknown>(buildUrl(path), { method: "DELETE" });
  }

  async function* paginate<T>(
    path: string,
    params?: Record<string, string>,
    options?: { pageSize?: number }
  ): AsyncGenerator<T[], void, undefined> {
    const pageSize = options?.pageSize ?? 100;
    let url: string | undefined = buildUrl(path, {
      ...params,
      limit: String(pageSize),
    });

    while (url) {
      type PageResponse = { results: T[]; _links?: { next?: string } };
      const page: PageResponse = await request<PageResponse>(url);

      if (page.results.length > 0) {
        yield page.results;
      }

      if (page._links?.next) {
        url = page._links.next.startsWith("http")
          ? page._links.next
          : `${baseUrl}${page._links.next}`;
      } else {
        url = undefined;
      }
    }
  }

  return {
    connectorId,
    cloudId,
    get,
    post,
    del,
    paginate,
  };
}
