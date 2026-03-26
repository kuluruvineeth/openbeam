import { logger } from "../lib/logger";
import { ShowpadApiError } from "./types";

const MAX_RETRY_ATTEMPTS = 3;
const BASE_RETRY_DELAY_MS = 1000;

export type ShowpadClientConfig = {
  connectorId: string;
  accessToken: string;
  subdomain: string;
};

export type ShowpadAsset = {
  id: string;
  name: string;
  description: string;
  slug: string;
  resourcetype: string;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
  isAnnotatable: boolean;
  isSensitive: boolean;
  isShareable: boolean;
  tags: ShowpadTag[];
  channels: { id: string; name: string }[];
  [key: string]: unknown;
};

export type ShowpadChannel = {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  assetCount: number;
  [key: string]: unknown;
};

export type ShowpadExperience = {
  id: string;
  name: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  createdBy: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
  } | null;
  [key: string]: unknown;
};

export type ShowpadTag = {
  id: string;
  name: string;
};

type PaginatedResponse<T> = {
  items: T[];
  count: number;
};

export type ShowpadClient = {
  readonly connectorId: string;
  readonly subdomain: string;
  get<T>(path: string, params?: Record<string, string>): Promise<T>;
  post<T>(path: string, body: unknown): Promise<T>;
  put<T>(path: string, body: unknown): Promise<T>;
  listAssets(
    offset: number,
    limit: number,
    params?: Record<string, string>
  ): Promise<PaginatedResponse<ShowpadAsset>>;
  listChannels(
    offset: number,
    limit: number
  ): Promise<PaginatedResponse<ShowpadChannel>>;
  listExperiences(
    offset: number,
    limit: number
  ): Promise<PaginatedResponse<ShowpadExperience>>;
  listTags(
    offset: number,
    limit: number
  ): Promise<PaginatedResponse<ShowpadTag>>;
  createChannel(name: string, description?: string): Promise<ShowpadChannel>;
  updateAssetMetadata(
    assetId: string,
    metadata: Record<string, string>
  ): Promise<ShowpadAsset>;
};

export function createShowpadClient(
  config: ShowpadClientConfig
): ShowpadClient {
  const { connectorId, accessToken, subdomain } = config;
  const apiBase = `https://${subdomain}.showpad.biz/api/v3`;

  type RequestOptions = {
    method: string;
    path: string;
    body?: unknown;
    params?: Record<string, string>;
    attempt?: number;
  };

  async function request<T>(opts: RequestOptions): Promise<T> {
    const { method, path, body, params, attempt = 0 } = opts;
    const url = new URL(`${apiBase}${path}`);
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        url.searchParams.set(key, value);
      }
    }

    const headers: Record<string, string> = {
      Authorization: `Bearer ${accessToken}`,
    };

    const fetchOptions: RequestInit = { method, headers };

    if (body !== undefined) {
      headers["Content-Type"] = "application/json";
      fetchOptions.body = JSON.stringify(body);
    }

    const response = await fetch(url.toString(), fetchOptions);

    if (response.status === 429) {
      const retryAfter = Number.parseInt(
        response.headers.get("Retry-After") ?? "60",
        10
      );
      if (attempt < MAX_RETRY_ATTEMPTS) {
        logger.warn(
          { connectorId, path, retryAfter, attempt },
          "Showpad API rate limited, retrying"
        );
        await new Promise((resolve) => setTimeout(resolve, retryAfter * 1000));
        return request<T>({
          method,
          path,
          body,
          params,
          attempt: attempt + 1,
        });
      }
      throw new ShowpadApiError({
        message: "Rate limited",
        statusCode: 429,
        code: "RATE_LIMITED",
        retryable: true,
        retryAfter,
      });
    }

    if (response.status === 401) {
      throw new ShowpadApiError({
        message: "Invalid or expired access token",
        statusCode: 401,
        code: "UNAUTHORIZED",
        retryable: false,
      });
    }

    if (response.status === 403) {
      throw new ShowpadApiError({
        message: "Forbidden",
        statusCode: 403,
        code: "FORBIDDEN",
        retryable: false,
      });
    }

    if (response.status === 404) {
      throw new ShowpadApiError({
        message: `Not found: ${path}`,
        statusCode: 404,
        code: "NOT_FOUND",
        retryable: false,
      });
    }

    if (!response.ok) {
      const retryable = response.status >= 500;
      if (retryable && attempt < MAX_RETRY_ATTEMPTS) {
        const delayMs =
          BASE_RETRY_DELAY_MS * 2 ** attempt +
          Math.random() * BASE_RETRY_DELAY_MS;
        logger.warn(
          { connectorId, path, statusCode: response.status, attempt },
          "Showpad API server error, retrying"
        );
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        return request<T>({
          method,
          path,
          body,
          params,
          attempt: attempt + 1,
        });
      }

      const errorText = await response.text().catch(() => "");
      throw new ShowpadApiError({
        message: `Request failed: ${response.status} ${errorText}`,
        statusCode: response.status,
        code: "SERVER_ERROR",
        retryable,
      });
    }

    if (response.status === 204) {
      return undefined as T;
    }

    const json = (await response.json()) as { response: T };
    return json.response;
  }

  function get<T>(path: string, params?: Record<string, string>): Promise<T> {
    return request<T>({ method: "GET", path, params });
  }

  function post<T>(path: string, body: unknown): Promise<T> {
    return request<T>({ method: "POST", path, body });
  }

  function put<T>(path: string, body: unknown): Promise<T> {
    return request<T>({ method: "PUT", path, body });
  }

  function listAssets(
    offset: number,
    limit: number,
    params: Record<string, string> = {}
  ): Promise<PaginatedResponse<ShowpadAsset>> {
    return get<PaginatedResponse<ShowpadAsset>>("/assets.json", {
      offset: String(offset),
      limit: String(limit),
      ...params,
    });
  }

  function listChannels(
    offset: number,
    limit: number
  ): Promise<PaginatedResponse<ShowpadChannel>> {
    return get<PaginatedResponse<ShowpadChannel>>("/channels.json", {
      offset: String(offset),
      limit: String(limit),
    });
  }

  function listExperiences(
    offset: number,
    limit: number
  ): Promise<PaginatedResponse<ShowpadExperience>> {
    return get<PaginatedResponse<ShowpadExperience>>("/experiences.json", {
      offset: String(offset),
      limit: String(limit),
    });
  }

  function listTags(
    offset: number,
    limit: number
  ): Promise<PaginatedResponse<ShowpadTag>> {
    return get<PaginatedResponse<ShowpadTag>>("/tags.json", {
      offset: String(offset),
      limit: String(limit),
    });
  }

  function createChannel(
    name: string,
    description?: string
  ): Promise<ShowpadChannel> {
    return post<ShowpadChannel>("/channels.json", {
      name,
      ...(description && { description }),
    });
  }

  function updateAssetMetadata(
    assetId: string,
    metadata: Record<string, string>
  ): Promise<ShowpadAsset> {
    return put<ShowpadAsset>(`/assets/${assetId}.json`, metadata);
  }

  return {
    connectorId,
    subdomain,
    get,
    post,
    put,
    listAssets,
    listChannels,
    listExperiences,
    listTags,
    createChannel,
    updateAssetMetadata,
  };
}
