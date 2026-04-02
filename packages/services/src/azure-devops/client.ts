import type { AzureDevOpsClientConfig } from "@openbeam/types/services/connectors/azure-devops";

const API_VERSION = "7.1";
const DEFAULT_TIMEOUT = 30_000;
const MAX_RETRIES = 3;
const BASE_RETRY_DELAY = 1000;

export interface AzureDevOpsClient {
  organization: string;
  get<T>(path: string, params?: Record<string, string>): Promise<T>;
  post<T>(path: string, body: unknown): Promise<T>;
  patch<T>(path: string, body: unknown): Promise<T>;
}

export function createAzureDevOpsClient(
  config: AzureDevOpsClientConfig
): AzureDevOpsClient {
  const { organization, accessToken, timeout = DEFAULT_TIMEOUT } = config;
  const baseUrl = `https://dev.azure.com/${encodeURIComponent(organization)}`;

  async function request<T>(
    method: string,
    path: string,
    body?: unknown,
    attempt = 0
  ): Promise<T> {
    const url = new URL(`${baseUrl}${path}`);
    if (!url.searchParams.has("api-version")) {
      url.searchParams.set("api-version", API_VERSION);
    }

    const contentType =
      (method === "PATCH" || method === "POST") && Array.isArray(body)
        ? "application/json-patch+json"
        : "application/json";

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    try {
      const res = await fetch(url.toString(), {
        method,
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": contentType,
          Accept: "application/json",
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      if (res.status === 429) {
        const retryAfter = Number(res.headers.get("Retry-After") || "60");
        if (attempt < MAX_RETRIES) {
          await sleep(retryAfter * 1000);
          return request(method, path, body, attempt + 1);
        }
        throw new AzureDevOpsApiError({
          message: "Rate limited",
          code: "RATE_LIMITED",
          retryable: true,
          retryAfter,
        });
      }

      if (res.status === 401 || res.status === 403) {
        throw new AzureDevOpsApiError({
          message: `Unauthorized: ${res.status}`,
          code: res.status === 401 ? "UNAUTHORIZED" : "FORBIDDEN",
          retryable: false,
        });
      }

      if (res.status === 404) {
        throw new AzureDevOpsApiError({
          message: "Not found",
          code: "NOT_FOUND",
          retryable: false,
        });
      }

      if (res.status >= 500 && attempt < MAX_RETRIES) {
        const jitter = Math.random() * 500;
        await sleep(BASE_RETRY_DELAY * 2 ** attempt + jitter);
        return request(method, path, body, attempt + 1);
      }

      if (!res.ok) {
        const text = await res.text();
        throw new AzureDevOpsApiError({
          message: `API error ${res.status}: ${text}`,
          code: "INTERNAL_ERROR",
          retryable: false,
        });
      }

      const text = await res.text();
      if (!text) {
        return {} as T;
      }
      return JSON.parse(text) as T;
    } finally {
      clearTimeout(timer);
    }
  }

  return {
    organization,
    get<T>(path: string, params?: Record<string, string>) {
      let fullPath = path;
      if (params) {
        const searchParams = new URLSearchParams(params);
        fullPath += (path.includes("?") ? "&" : "?") + searchParams.toString();
      }
      return request<T>("GET", fullPath);
    },
    post<T>(path: string, body: unknown) {
      return request<T>("POST", path, body);
    },
    patch<T>(path: string, body: unknown) {
      return request<T>("PATCH", path, body);
    },
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class AzureDevOpsApiError extends Error {
  readonly code: string;
  readonly retryable: boolean;
  readonly retryAfter?: number;

  constructor(options: {
    message: string;
    code: string;
    retryable: boolean;
    retryAfter?: number;
  }) {
    super(options.message);
    this.name = "AzureDevOpsApiError";
    this.code = options.code;
    this.retryable = options.retryable;
    this.retryAfter = options.retryAfter;
  }

  static isAuthError(code: string): boolean {
    return code === "UNAUTHORIZED" || code === "FORBIDDEN";
  }
}
