import { logger } from "../lib/logger";
import { EgnyteApiError } from "./types";

const MAX_RETRY_ATTEMPTS = 3;
const BASE_RETRY_DELAY_MS = 1000;

export type EgnyteClientConfig = {
  connectorId: string;
  accessToken: string;
  domain: string;
};

export type EgnyteFileEntry = {
  checksum?: string;
  size?: number;
  path: string;
  name: string;
  locked: boolean;
  is_folder: boolean;
  entry_id?: string;
  group_id?: string;
  last_modified?: string;
  uploaded?: string;
  created?: string;
  uploaded_by?: string;
  num_files?: number;
  num_folders?: number;
  folder_id?: string;
  parent_id?: string;
  versions?: EgnyteFileVersion[];
};

export type EgnyteFileVersion = {
  checksum?: string;
  size?: number;
  uploaded?: string;
  uploaded_by?: string;
  entry_id?: string;
};

type FolderListingResponse = {
  name: string;
  path: string;
  folder_id: string;
  is_folder: true;
  files?: EgnyteFileEntry[];
  folders?: EgnyteFileEntry[];
  count: number;
  offset: number;
  total_count: number;
};

export type EgnyteLink = {
  id: string;
  url: string;
  path: string;
  type: "file" | "folder" | "upload";
  accessibility: string;
  creation_date: string;
  created_by: string;
  expiry_date?: string;
  link_to_current: boolean;
  recipients?: string[];
};

type LinksListResponse = {
  links: EgnyteLink[];
  count: number;
  offset: number;
  total_count: number;
};

export type EgnyteEvent = {
  action: string;
  timestamp: string;
  data?: {
    path?: string;
    target_path?: string;
    entry_id?: string;
  };
};

type EventsResponse = {
  events: EgnyteEvent[];
  latest_event_id: number;
  oldest_event_id: number;
};

export type EgnyteClient = {
  readonly connectorId: string;
  readonly domain: string;
  get<T>(path: string, params?: Record<string, string>): Promise<T>;
  post<T>(path: string, body: unknown): Promise<T>;
  del(path: string): Promise<void>;
  listFolder(
    folderPath: string,
    offset: number,
    count: number
  ): Promise<FolderListingResponse>;
  listLinks(offset: number, count: number): Promise<LinksListResponse>;
  getEvents(startId: string, count: number): Promise<EventsResponse>;
  createFolder(path: string): Promise<FolderListingResponse>;
  createLink(
    path: string,
    linkType: "file" | "folder",
    accessibility: string
  ): Promise<EgnyteLink>;
  deleteItem(path: string): Promise<void>;
};

export function createEgnyteClient(config: EgnyteClientConfig): EgnyteClient {
  const { connectorId, accessToken, domain } = config;
  const apiBase = `https://${domain}.egnyte.com/pubapi/v1`;

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
          "Egnyte API rate limited, retrying"
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
      throw new EgnyteApiError({
        message: "Rate limited",
        statusCode: 429,
        code: "RATE_LIMITED",
        retryable: true,
        retryAfter,
      });
    }

    if (response.status === 401) {
      throw new EgnyteApiError({
        message: "Invalid or expired access token",
        statusCode: 401,
        code: "INVALID_ACCESS_TOKEN",
        retryable: false,
      });
    }

    if (response.status === 404) {
      throw new EgnyteApiError({
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
          "Egnyte API server error, retrying"
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
      throw new EgnyteApiError({
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

  function listFolder(
    folderPath: string,
    offset: number,
    count: number
  ): Promise<FolderListingResponse> {
    const normalizedPath = folderPath.startsWith("/")
      ? folderPath
      : `/${folderPath}`;
    return get<FolderListingResponse>(`/fs${normalizedPath}`, {
      list_content: "true",
      offset: String(offset),
      count: String(count),
      sort_by: "last_modified",
      sort_direction: "descending",
    });
  }

  function listLinks(
    offset: number,
    count: number
  ): Promise<LinksListResponse> {
    return get<LinksListResponse>("/links", {
      offset: String(offset),
      count: String(count),
    });
  }

  function getEvents(startId: string, count: number): Promise<EventsResponse> {
    return get<EventsResponse>("/events", {
      id: startId,
      count: String(count),
      suppress: "user",
    });
  }

  function createFolder(path: string): Promise<FolderListingResponse> {
    const normalizedPath = path.startsWith("/") ? path : `/${path}`;
    return post<FolderListingResponse>(`/fs${normalizedPath}`, {
      action: "add_folder",
    });
  }

  function createLink(
    path: string,
    linkType: "file" | "folder",
    accessibility: string
  ): Promise<EgnyteLink> {
    return post<EgnyteLink>("/links", {
      path,
      type: linkType,
      accessibility,
    });
  }

  async function deleteItem(path: string): Promise<void> {
    const normalizedPath = path.startsWith("/") ? path : `/${path}`;
    await request<void>({ method: "DELETE", path: `/fs${normalizedPath}` });
  }

  return {
    connectorId,
    domain,
    get,
    post,
    del,
    listFolder,
    listLinks,
    getEvents,
    createFolder,
    createLink,
    deleteItem,
  };
}
