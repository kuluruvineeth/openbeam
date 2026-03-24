import { logger } from "../lib/logger";
import { BynderApiError } from "./types";

const MAX_RETRY_ATTEMPTS = 3;
const BASE_RETRY_DELAY_MS = 1000;

export type BynderClientConfig = {
  connectorId: string;
  accessToken: string;
  domain: string;
};

export type BynderAsset = {
  id: string;
  name: string;
  description: string;
  type: string;
  brandId: string;
  tags: string[];
  dateCreated: string;
  dateModified: string;
  datePublished: string;
  archive: number;
  copyright: string;
  watermarked: number;
  orientation: string;
  width: number;
  height: number;
  fileSize: number;
  extension: string[];
  thumbnails?: Record<string, string>;
  property_assettype?: string;
  isPublic: number;
  propertyOptions?: string[];
  [key: string]: unknown;
};

export type BynderCollection = {
  id: string;
  name: string;
  description: string;
  dateCreated: string;
  dateModified: string;
  mediaCount: number;
  link: string;
  isPublic: boolean;
  collectionCount: number;
  [key: string]: unknown;
};

export type BynderTag = {
  id: string;
  tag: string;
  mediaCount: number;
};

type AssetListResponse = BynderAsset[];
type CollectionListResponse = BynderCollection[];
type TagListResponse = BynderTag[];

export type BynderClient = {
  readonly connectorId: string;
  readonly domain: string;
  get<T>(path: string, params?: Record<string, string>): Promise<T>;
  post<T>(path: string, body: unknown): Promise<T>;
  del(path: string): Promise<void>;
  listAssets(
    page: number,
    limit: number,
    params?: Record<string, string>
  ): Promise<AssetListResponse>;
  listCollections(page: number, limit: number): Promise<CollectionListResponse>;
  listTags(): Promise<TagListResponse>;
  createCollection(
    name: string,
    description?: string
  ): Promise<BynderCollection>;
  addAssetToCollection(collectionId: string, assetId: string): Promise<void>;
};

export function createBynderClient(config: BynderClientConfig): BynderClient {
  const { connectorId, accessToken, domain } = config;
  const apiBase = `https://${domain}.bynder.com/api/v4`;

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
          "Bynder API rate limited, retrying"
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
      throw new BynderApiError({
        message: "Rate limited",
        statusCode: 429,
        code: "RATE_LIMITED",
        retryable: true,
        retryAfter,
      });
    }

    if (response.status === 401) {
      throw new BynderApiError({
        message: "Invalid or expired access token",
        statusCode: 401,
        code: "UNAUTHORIZED",
        retryable: false,
      });
    }

    if (response.status === 403) {
      throw new BynderApiError({
        message: "Forbidden",
        statusCode: 403,
        code: "FORBIDDEN",
        retryable: false,
      });
    }

    if (response.status === 404) {
      throw new BynderApiError({
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
          "Bynder API server error, retrying"
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
      throw new BynderApiError({
        message: `Request failed: ${response.status} ${errorText}`,
        statusCode: response.status,
        code: "SERVER_ERROR",
        retryable,
      });
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return response.json() as Promise<T>;
  }

  function get<T>(path: string, params?: Record<string, string>): Promise<T> {
    return request<T>({ method: "GET", path, params });
  }

  function post<T>(path: string, body: unknown): Promise<T> {
    return request<T>({ method: "POST", path, body });
  }

  async function del(path: string): Promise<void> {
    await request<void>({ method: "DELETE", path });
  }

  function listAssets(
    page: number,
    limit: number,
    params: Record<string, string> = {}
  ): Promise<AssetListResponse> {
    return get<AssetListResponse>("/media/", {
      page: String(page),
      limit: String(limit),
      orderBy: "dateModified desc",
      ...params,
    });
  }

  function listCollections(
    page: number,
    limit: number
  ): Promise<CollectionListResponse> {
    return get<CollectionListResponse>("/collections/", {
      page: String(page),
      limit: String(limit),
    });
  }

  function listTags(): Promise<TagListResponse> {
    return get<TagListResponse>("/tags/");
  }

  function createCollection(
    name: string,
    description?: string
  ): Promise<BynderCollection> {
    return post<BynderCollection>("/collections/", {
      name,
      ...(description && { description }),
    });
  }

  async function addAssetToCollection(
    collectionId: string,
    assetId: string
  ): Promise<void> {
    await post<void>(`/collections/${collectionId}/media/`, {
      data: [assetId],
    });
  }

  return {
    connectorId,
    domain,
    get,
    post,
    del,
    listAssets,
    listCollections,
    listTags,
    createCollection,
    addAssetToCollection,
  };
}
