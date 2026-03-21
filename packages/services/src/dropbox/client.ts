import { logger } from "../lib/logger";
import { DropboxApiError } from "./types";

const RPC_BASE = "https://api.dropboxapi.com/2";
const MAX_RETRY_ATTEMPTS = 3;
const BASE_RETRY_DELAY_MS = 1000;

export type DropboxClientConfig = {
  connectorId: string;
  accessToken: string;
};

type ListFolderResponse = {
  entries: DropboxEntry[];
  cursor: string;
  has_more: boolean;
};

export type DropboxEntry = {
  ".tag": "file" | "folder" | "deleted";
  id: string;
  name: string;
  path_lower?: string;
  path_display?: string;
  server_modified?: string;
  client_modified?: string;
  size?: number;
  content_hash?: string;
  is_downloadable?: boolean;
  sharing_info?: {
    read_only?: boolean;
    shared_folder_id?: string;
    parent_shared_folder_id?: string;
  };
};

type CreateFolderResult = {
  metadata: {
    id: string;
    name: string;
    path_lower: string;
    path_display: string;
  };
};

type MoveResult = {
  metadata: {
    ".tag": string;
    id: string;
    name: string;
    path_lower: string;
    path_display: string;
  };
};

export type DropboxClient = {
  readonly connectorId: string;
  rpc<T>(endpoint: string, body: unknown): Promise<T>;
  listFolder(path: string, recursive: boolean): Promise<ListFolderResponse>;
  listFolderContinue(cursor: string): Promise<ListFolderResponse>;
  listFolderLatestCursor(
    path: string,
    recursive: boolean
  ): Promise<{ cursor: string }>;
  createFolder(path: string): Promise<CreateFolderResult>;
  moveEntry(fromPath: string, toPath: string): Promise<MoveResult>;
  deleteEntry(path: string): Promise<void>;
};

export function createDropboxClient(
  config: DropboxClientConfig
): DropboxClient {
  const { connectorId, accessToken } = config;

  async function rpc<T>(
    endpoint: string,
    body: unknown,
    attempt = 0
  ): Promise<T> {
    const url = `${RPC_BASE}${endpoint}`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (response.status === 429) {
      const retryAfter = Number.parseInt(
        response.headers.get("Retry-After") ?? "60",
        10
      );
      if (attempt < MAX_RETRY_ATTEMPTS) {
        logger.warn(
          { connectorId, endpoint, retryAfter, attempt },
          "Dropbox API rate limited, retrying"
        );
        await new Promise((resolve) => setTimeout(resolve, retryAfter * 1000));
        return rpc<T>(endpoint, body, attempt + 1);
      }
      throw new DropboxApiError({
        message: "Rate limited",
        statusCode: 429,
        code: "RATE_LIMITED",
        retryable: true,
        retryAfter,
      });
    }

    if (response.status === 401) {
      throw new DropboxApiError({
        message: "Invalid or expired access token",
        statusCode: 401,
        code: "INVALID_ACCESS_TOKEN",
        retryable: false,
      });
    }

    if (response.status === 409) {
      const errorBody = (await response.json().catch(() => ({}))) as Record<
        string,
        unknown
      >;
      const errorTag = (errorBody.error as Record<string, unknown>)?.[".tag"] as
        | string
        | undefined;

      if (errorTag === "reset") {
        throw new DropboxApiError({
          message: "Cursor expired, full resync required",
          statusCode: 409,
          code: "CURSOR_RESET",
          retryable: false,
        });
      }

      throw new DropboxApiError({
        message: `Endpoint-specific error: ${JSON.stringify(errorBody)}`,
        statusCode: 409,
        code: errorTag ?? "ENDPOINT_ERROR",
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
          { connectorId, endpoint, statusCode: response.status, attempt },
          "Dropbox API server error, retrying"
        );
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        return rpc<T>(endpoint, body, attempt + 1);
      }

      const errorText = await response.text().catch(() => "");
      throw new DropboxApiError({
        message: `Request failed: ${response.status} ${errorText}`,
        statusCode: response.status,
        code: "SERVER_ERROR",
        retryable,
      });
    }

    return response.json() as Promise<T>;
  }

  function listFolder(
    path: string,
    recursive: boolean
  ): Promise<ListFolderResponse> {
    return rpc<ListFolderResponse>("/files/list_folder", {
      path,
      recursive,
      include_deleted: false,
      include_mounted_folders: true,
      limit: 2000,
    });
  }

  function listFolderContinue(cursor: string): Promise<ListFolderResponse> {
    return rpc<ListFolderResponse>("/files/list_folder/continue", { cursor });
  }

  function listFolderLatestCursor(
    path: string,
    recursive: boolean
  ): Promise<{ cursor: string }> {
    return rpc<{ cursor: string }>("/files/list_folder/get_latest_cursor", {
      path,
      recursive,
      include_deleted: false,
      include_mounted_folders: true,
    });
  }

  function createFolder(path: string): Promise<CreateFolderResult> {
    return rpc<CreateFolderResult>("/files/create_folder_v2", {
      path,
      autorename: false,
    });
  }

  function moveEntry(fromPath: string, toPath: string): Promise<MoveResult> {
    return rpc<MoveResult>("/files/move_v2", {
      from_path: fromPath,
      to_path: toPath,
      autorename: false,
    });
  }

  async function deleteEntry(path: string): Promise<void> {
    await rpc("/files/delete_v2", { path });
  }

  return {
    connectorId,
    rpc,
    listFolder,
    listFolderContinue,
    listFolderLatestCursor,
    createFolder,
    moveEntry,
    deleteEntry,
  };
}
