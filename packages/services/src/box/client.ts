import { logger } from "../lib/logger";
import { BoxApiError } from "./types";

const API_BASE = "https://api.box.com/2.0";
const MAX_RETRY_ATTEMPTS = 3;
const BASE_RETRY_DELAY_MS = 1000;

export type BoxClientConfig = {
  connectorId: string;
  accessToken: string;
};

export type BoxItem = {
  type: "file" | "folder" | "web_link";
  id: string;
  name: string;
  description?: string;
  size?: number;
  sha1?: string;
  created_at?: string;
  modified_at?: string;
  content_modified_at?: string;
  created_by?: { id: string; name: string; login: string };
  modified_by?: { id: string; name: string; login: string };
  owned_by?: { id: string; name: string; login: string };
  path_collection?: {
    total_count: number;
    entries: Array<{ type: string; id: string; name: string }>;
  };
  shared_link?: {
    url: string;
    access: string;
  } | null;
  item_status?: string;
  url?: string;
  trashed_at?: string | null;
};

type FolderItemsResponse = {
  total_count: number;
  entries: BoxItem[];
  offset: number;
  limit: number;
  order: Array<{ by: string; direction: string }>;
};

type EventsResponse = {
  chunk_size: number;
  next_stream_position: string;
  entries: BoxEvent[];
};

export type BoxEvent = {
  type: "event";
  event_id: string;
  event_type: string;
  created_at: string;
  source?: BoxItem;
};

type CreateFolderResponse = {
  type: "folder";
  id: string;
  name: string;
  path_collection: {
    total_count: number;
    entries: Array<{ type: string; id: string; name: string }>;
  };
};

export type BoxClient = {
  readonly connectorId: string;
  get<T>(path: string, params?: Record<string, string>): Promise<T>;
  post<T>(path: string, body: unknown): Promise<T>;
  put<T>(path: string, body: unknown): Promise<T>;
  del(path: string): Promise<void>;
  getFolderItems(
    folderId: string,
    offset: number,
    limit: number
  ): Promise<FolderItemsResponse>;
  getEvents(streamPosition: string, limit: number): Promise<EventsResponse>;
  createFolder(name: string, parentId: string): Promise<CreateFolderResponse>;
  moveItem(
    itemType: "file" | "folder",
    itemId: string,
    newParentId: string
  ): Promise<BoxItem>;
  deleteItem(itemType: "file" | "folder", itemId: string): Promise<void>;
  createSharedLink(
    itemType: "file" | "folder",
    itemId: string,
    access: string
  ): Promise<BoxItem>;
};

export function createBoxClient(config: BoxClientConfig): BoxClient {
  const { connectorId, accessToken } = config;

  type RequestOptions = {
    method: string;
    path: string;
    body?: unknown;
    params?: Record<string, string>;
    attempt?: number;
  };

  async function request<T>(opts: RequestOptions): Promise<T> {
    const { method, path, body, params, attempt = 0 } = opts;
    const url = new URL(`${API_BASE}${path}`);
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
          "Box API rate limited, retrying"
        );
        await new Promise((resolve) => setTimeout(resolve, retryAfter * 1000));
        return request<T>({ method, path, body, params, attempt: attempt + 1 });
      }
      throw new BoxApiError({
        message: "Rate limited",
        statusCode: 429,
        code: "RATE_LIMITED",
        retryable: true,
        retryAfter,
      });
    }

    if (response.status === 401) {
      throw new BoxApiError({
        message: "Invalid or expired access token",
        statusCode: 401,
        code: "INVALID_ACCESS_TOKEN",
        retryable: false,
      });
    }

    if (response.status === 404) {
      throw new BoxApiError({
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
          "Box API server error, retrying"
        );
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        return request<T>({ method, path, body, params, attempt: attempt + 1 });
      }

      const errorText = await response.text().catch(() => "");
      throw new BoxApiError({
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

  function put<T>(path: string, body: unknown): Promise<T> {
    return request<T>({ method: "PUT", path, body });
  }

  async function del(path: string): Promise<void> {
    await request<void>({ method: "DELETE", path });
  }

  const FOLDER_FIELDS =
    "id,type,name,description,size,sha1,created_at,modified_at,content_modified_at,created_by,modified_by,owned_by,path_collection,shared_link,item_status,trashed_at,url";

  function getFolderItems(
    folderId: string,
    offset: number,
    limit: number
  ): Promise<FolderItemsResponse> {
    return get<FolderItemsResponse>(`/folders/${folderId}/items`, {
      fields: FOLDER_FIELDS,
      offset: String(offset),
      limit: String(limit),
    });
  }

  function getEvents(
    streamPosition: string,
    limit: number
  ): Promise<EventsResponse> {
    return get<EventsResponse>("/events", {
      stream_type: "changes",
      stream_position: streamPosition,
      limit: String(limit),
    });
  }

  function createFolder(
    name: string,
    parentId: string
  ): Promise<CreateFolderResponse> {
    return post<CreateFolderResponse>("/folders", {
      name,
      parent: { id: parentId },
    });
  }

  function moveItem(
    itemType: "file" | "folder",
    itemId: string,
    newParentId: string
  ): Promise<BoxItem> {
    const endpoint =
      itemType === "file" ? `/files/${itemId}` : `/folders/${itemId}`;
    return put<BoxItem>(endpoint, { parent: { id: newParentId } });
  }

  async function deleteItem(
    itemType: "file" | "folder",
    itemId: string
  ): Promise<void> {
    const endpoint =
      itemType === "file" ? `/files/${itemId}` : `/folders/${itemId}`;
    const params = itemType === "folder" ? { recursive: "true" } : undefined;
    await request<void>({ method: "DELETE", path: endpoint, params });
  }

  function createSharedLink(
    itemType: "file" | "folder",
    itemId: string,
    access: string
  ): Promise<BoxItem> {
    const endpoint =
      itemType === "file" ? `/files/${itemId}` : `/folders/${itemId}`;
    return put<BoxItem>(endpoint, {
      shared_link: { access },
    });
  }

  return {
    connectorId,
    get,
    post,
    put,
    del,
    getFolderItems,
    getEvents,
    createFolder,
    moveItem,
    deleteItem,
    createSharedLink,
  };
}
