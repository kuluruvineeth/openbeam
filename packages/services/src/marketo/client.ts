import { type RateLimitConfig, rateLimiter } from "@openbeam/redis";
import type { MarketoClientConfig } from "@openbeam/types/services/connectors/marketo";
import { logger } from "../lib/logger";
import { MarketoApiError } from "./types";

const DEFAULT_TIMEOUT = 30_000;
const DEFAULT_RETRY_ATTEMPTS = 3;
const BASE_RETRY_DELAY = 1000;
const MAX_RETRY_DELAY = 30_000;

const RATE_LIMITS: RateLimitConfig = {
  requestsPerMinute: 300,
  requestsPerHour: 50_000,
  burstLimit: 100,
};

type MarketoApiResponse<T> = {
  requestId: string;
  success: boolean;
  result?: T[];
  errors?: Array<{ code: string; message: string }>;
  moreResult?: boolean;
  nextPageToken?: string;
};

type MarketoAssetResponse<T> = {
  success: boolean;
  errors?: Array<{ code: string; message: string }>;
  requestId?: string;
  warnings?: string[];
  result?: T[];
};

export interface MarketoClient {
  readonly connectorId: string;
  readonly munchkinId: string;
  getApi<T>(
    path: string,
    params?: Record<string, string>
  ): Promise<MarketoApiResponse<T>>;
  getAsset<T>(
    path: string,
    params?: Record<string, string>
  ): Promise<MarketoAssetResponse<T>>;
  postApi<T>(path: string, body: unknown): Promise<MarketoApiResponse<T>>;
  listAllApi<T>(
    path: string,
    params?: Record<string, string>,
    pageSize?: number
  ): AsyncGenerator<T[], void, undefined>;
  listAllAssets<T>(
    path: string,
    params?: Record<string, string>,
    pageSize?: number
  ): AsyncGenerator<T[], void, undefined>;
  healthCheck(): Promise<boolean>;
}

export function createMarketoClient(
  config: MarketoClientConfig
): MarketoClient {
  const {
    connectorId,
    accessToken,
    munchkinId,
    timeout = DEFAULT_TIMEOUT,
  } = config;
  const restBaseUrl = `https://${munchkinId}.mktorest.com/rest`;
  const assetBaseUrl = `https://${munchkinId}.mktorest.com/rest/asset`;

  async function checkRateLimit(): Promise<void> {
    const { allowed } = await rateLimiter.checkConnectorRateLimit(
      connectorId,
      "marketo",
      RATE_LIMITS
    );

    if (!allowed) {
      const quotaAvailable = await rateLimiter.waitForQuota(
        connectorId,
        "marketo",
        RATE_LIMITS,
        5
      );

      if (!quotaAvailable) {
        throw new MarketoApiError({
          message: "Rate limit exceeded",
          code: "RATE_LIMITED",
          retryable: true,
          retryAfter: 20,
        });
      }
    }
  }

  async function fetchJson<T>(
    url: string,
    init?: RequestInit,
    attempt = 0
  ): Promise<T> {
    await checkRateLimit();

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    let response: Response;
    try {
      response = await fetch(url, {
        ...init,
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
          "Content-Type": "application/json",
          ...(init?.headers as Record<string, string>),
        },
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }

    if (response.status === 429) {
      const retryAfter = Number.parseInt(
        response.headers.get("Retry-After") ?? "20",
        10
      );
      if (attempt < DEFAULT_RETRY_ATTEMPTS) {
        logger.warn(
          { connectorId, url, retryAfter, attempt },
          "Marketo API rate limited, retrying"
        );
        await sleep(Math.min(retryAfter * 1000, MAX_RETRY_DELAY));
        return fetchJson<T>(url, init, attempt + 1);
      }
      throw new MarketoApiError({
        message: "Rate limited",
        statusCode: 429,
        code: "RATE_LIMITED",
        retryable: true,
        retryAfter,
      });
    }

    if (response.status === 401) {
      throw new MarketoApiError({
        message: "Unauthorized - invalid or expired access token",
        statusCode: 401,
        code: "UNAUTHORIZED",
        retryable: false,
      });
    }

    if (response.status === 403) {
      throw new MarketoApiError({
        message: "Forbidden - insufficient permissions",
        statusCode: 403,
        code: "FORBIDDEN",
        retryable: false,
      });
    }

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      if (response.status >= 500 && attempt < DEFAULT_RETRY_ATTEMPTS) {
        const delay = Math.min(
          BASE_RETRY_DELAY * 2 ** attempt + Math.random() * BASE_RETRY_DELAY,
          MAX_RETRY_DELAY
        );
        logger.warn(
          { connectorId, status: response.status, attempt },
          "Marketo API server error, retrying"
        );
        await sleep(delay);
        return fetchJson<T>(url, init, attempt + 1);
      }
      throw new MarketoApiError({
        message: `Marketo API ${response.status}: ${body}`,
        code: "API_ERROR",
        statusCode: response.status,
        retryable: false,
      });
    }

    const json = (await response.json()) as T;
    checkMarketoErrors(json);
    return json;
  }

  function checkMarketoErrors(json: unknown): void {
    const resp = json as {
      success?: boolean;
      errors?: Array<{ code: string; message: string }>;
    };
    if (resp.success === false && resp.errors?.length) {
      const firstError = resp.errors[0];
      if (!firstError) {
        return;
      }
      const err = firstError;
      const code = err.code;
      if (code === "601" || code === "602") {
        throw new MarketoApiError({
          message: `Marketo auth error: ${err.message}`,
          code: "TOKEN_EXPIRED",
          retryable: false,
        });
      }
      if (code === "606" || code === "607" || code === "615") {
        throw new MarketoApiError({
          message: `Marketo rate limit: ${err.message}`,
          code: "RATE_LIMITED",
          retryable: true,
          retryAfter: 20,
        });
      }
      throw new MarketoApiError({
        message: `Marketo API error [${code}]: ${err.message}`,
        code: "API_ERROR",
        retryable: false,
      });
    }
  }

  function buildUrl(
    base: string,
    path: string,
    params?: Record<string, string>
  ): string {
    const url = new URL(`${base}${path}`);
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== "") {
          url.searchParams.set(key, value);
        }
      }
    }
    return url.toString();
  }

  function getApi<T>(
    path: string,
    params?: Record<string, string>
  ): Promise<MarketoApiResponse<T>> {
    return fetchJson<MarketoApiResponse<T>>(
      buildUrl(restBaseUrl, path, params)
    );
  }

  function getAsset<T>(
    path: string,
    params?: Record<string, string>
  ): Promise<MarketoAssetResponse<T>> {
    return fetchJson<MarketoAssetResponse<T>>(
      buildUrl(assetBaseUrl, path, params)
    );
  }

  function postApi<T>(
    path: string,
    body: unknown
  ): Promise<MarketoApiResponse<T>> {
    return fetchJson<MarketoApiResponse<T>>(buildUrl(restBaseUrl, path), {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  async function* listAllApi<T>(
    path: string,
    params?: Record<string, string>,
    pageSize = 300
  ): AsyncGenerator<T[], void, undefined> {
    let nextPageToken: string | undefined;

    do {
      const queryParams: Record<string, string> = {
        ...params,
        batchSize: String(pageSize),
      };
      if (nextPageToken) {
        queryParams.nextPageToken = nextPageToken;
      }

      const response = await getApi<T>(path, queryParams);
      const result = response.result ?? [];
      if (result.length > 0) {
        yield result;
      }

      nextPageToken = response.moreResult ? response.nextPageToken : undefined;
    } while (nextPageToken);
  }

  async function* listAllAssets<T>(
    path: string,
    params?: Record<string, string>,
    pageSize = 200
  ): AsyncGenerator<T[], void, undefined> {
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
      const queryParams: Record<string, string> = {
        ...params,
        maxReturn: String(pageSize),
        offset: String(offset),
      };

      const response = await getAsset<T>(path, queryParams);
      const result = response.result ?? [];
      if (result.length > 0) {
        yield result;
      }

      hasMore = result.length >= pageSize;
      offset += pageSize;
    }
  }

  async function healthCheck(): Promise<boolean> {
    try {
      await getApi("/v1/campaigns.json", { batchSize: "1" });
      return true;
    } catch (error) {
      if (
        error instanceof MarketoApiError &&
        MarketoApiError.isAuthError(error.code)
      ) {
        return false;
      }
      return false;
    }
  }

  return {
    connectorId,
    munchkinId,
    getApi,
    getAsset,
    postApi,
    listAllApi,
    listAllAssets,
    healthCheck,
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
