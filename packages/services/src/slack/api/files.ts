import type { SlackFile } from "@openbeam/types/services/connectors/slack";
import { getAllSupportedTypes } from "../../engine/supported-types";
import type { SlackClient } from "../client";

export interface ListFilesOptions {
  channel?: string;
  user?: string;
  tsFrom?: string;
  tsTo?: string;
  types?: string;
  count?: number;
  page?: number;
}

export interface ListFilesResponse {
  ok: boolean;
  files: SlackFile[];
  paging?: {
    count: number;
    total: number;
    page: number;
    pages: number;
  };
}

export interface GetFileInfoResponse {
  ok: boolean;
  file: SlackFile;
}

export function listFiles(
  client: SlackClient,
  options: ListFilesOptions = {}
): Promise<ListFilesResponse> {
  const { channel, user, tsFrom, tsTo, types, count = 100, page = 1 } = options;

  const args: Record<string, unknown> = {
    count,
    page,
  };

  if (channel) {
    args.channel = channel;
  }
  if (user) {
    args.user = user;
  }
  if (tsFrom) {
    args.ts_from = tsFrom;
  }
  if (tsTo) {
    args.ts_to = tsTo;
  }
  if (types) {
    args.types = types;
  }

  return client.call<ListFilesResponse>("files.list", args);
}

export async function* getAllFiles(
  client: SlackClient,
  options: Omit<ListFilesOptions, "page"> = {}
): AsyncGenerator<SlackFile[], void, undefined> {
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const response = await listFiles(client, { ...options, page });

    if (!(response.ok && response.files.length)) {
      break;
    }

    yield response.files;

    if (response.paging) {
      hasMore = page < response.paging.pages;
      page += 1;
    } else {
      hasMore = false;
    }
  }
}

export function getFileInfo(
  client: SlackClient,
  fileId: string
): Promise<GetFileInfoResponse> {
  return client.call<GetFileInfoResponse>("files.info", { file: fileId });
}

export function getFilesSince(
  client: SlackClient,
  timestamp: string,
  options: Omit<ListFilesOptions, "tsFrom" | "page"> = {}
): AsyncGenerator<SlackFile[], void, undefined> {
  return getAllFiles(client, {
    ...options,
    tsFrom: timestamp,
  });
}

export function filterSupportedFiles(files: SlackFile[]): SlackFile[] {
  const { mimes, extensions } = getAllSupportedTypes();
  const supportedMimeTypes = new Set(mimes);
  const supportedExtensions = new Set(extensions);

  return files.filter((file) => {
    if (supportedMimeTypes.has(file.mimetype)) {
      return true;
    }

    if (file.filetype && supportedExtensions.has(file.filetype.toLowerCase())) {
      return true;
    }

    return false;
  });
}

export function hasDownloadUrl(file: SlackFile): boolean {
  return !!(file.url_private_download || file.url_private);
}

export function getDownloadUrl(file: SlackFile): string | undefined {
  return file.url_private_download || file.url_private;
}
