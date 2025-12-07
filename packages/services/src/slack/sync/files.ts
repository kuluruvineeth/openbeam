import {
  filterSupportedFiles,
  getAllFiles,
  getDownloadUrl,
  getFilesSince,
  hasDownloadUrl,
  type ListFilesOptions,
} from "../api/files";
import type { SlackClient } from "../client";
import type { SlackFile, TransformContext } from "../types";

export interface FileSyncOptions {
  channelIds?: string[];
  userIds?: string[];
  lastSyncTimestamp?: string;
  batchSize?: number;
  filterSupported?: boolean;
}

export interface FileSyncBatch {
  files: SlackFileInfo[];
  hasMore: boolean;
  stats: {
    total: number;
    supported: number;
    skipped: number;
  };
}

export interface SlackFileInfo {
  id: string;
  name: string;
  title?: string;
  mimeType: string;
  fileType?: string;
  size?: number;
  downloadUrl?: string;
  permalink?: string;
  createdAt?: number;
  userId?: string;
  channels?: string[];
}

export function transformSlackFile(file: SlackFile): SlackFileInfo {
  return {
    id: file.id,
    name: file.name,
    title: file.title,
    mimeType: file.mimetype,
    fileType: file.filetype,
    size: file.size,
    downloadUrl: getDownloadUrl(file),
    permalink: file.permalink,
    createdAt: file.created,
    userId: file.user,
    channels: file.channels,
  };
}

export async function* syncFiles(
  client: SlackClient,
  _context: TransformContext,
  options: FileSyncOptions = {}
): AsyncGenerator<FileSyncBatch, void, undefined> {
  const {
    channelIds,
    userIds,
    lastSyncTimestamp,
    batchSize = 100,
    filterSupported = true,
  } = options;

  const listOptions: Omit<ListFilesOptions, "page"> = {
    count: batchSize,
  };

  if (channelIds && channelIds.length > 0) {
    for (const channelId of channelIds) {
      yield* syncFilesForChannel(client, channelId, {
        ...options,
        listOptions,
      });
    }
    return;
  }

  if (userIds && userIds.length > 0) {
    for (const userId of userIds) {
      yield* syncFilesForUser(client, userId, {
        ...options,
        listOptions,
      });
    }
    return;
  }

  const fileGenerator = lastSyncTimestamp
    ? getFilesSince(client, lastSyncTimestamp, listOptions)
    : getAllFiles(client, listOptions);

  for await (const files of fileGenerator) {
    const batch = processBatch(files, filterSupported);
    if (batch.files.length > 0) {
      yield batch;
    }
  }
}

async function* syncFilesForChannel(
  client: SlackClient,
  channelId: string,
  options: {
    lastSyncTimestamp?: string;
    filterSupported?: boolean;
    listOptions: Omit<ListFilesOptions, "page">;
  }
): AsyncGenerator<FileSyncBatch, void, undefined> {
  const { lastSyncTimestamp, filterSupported = true, listOptions } = options;

  const channelOptions = {
    ...listOptions,
    channel: channelId,
  };

  const fileGenerator = lastSyncTimestamp
    ? getFilesSince(client, lastSyncTimestamp, channelOptions)
    : getAllFiles(client, channelOptions);

  for await (const files of fileGenerator) {
    const batch = processBatch(files, filterSupported);
    if (batch.files.length > 0) {
      yield batch;
    }
  }
}

async function* syncFilesForUser(
  client: SlackClient,
  userId: string,
  options: {
    lastSyncTimestamp?: string;
    filterSupported?: boolean;
    listOptions: Omit<ListFilesOptions, "page">;
  }
): AsyncGenerator<FileSyncBatch, void, undefined> {
  const { lastSyncTimestamp, filterSupported = true, listOptions } = options;

  const userOptions = {
    ...listOptions,
    user: userId,
  };

  const fileGenerator = lastSyncTimestamp
    ? getFilesSince(client, lastSyncTimestamp, userOptions)
    : getAllFiles(client, userOptions);

  for await (const files of fileGenerator) {
    const batch = processBatch(files, filterSupported);
    if (batch.files.length > 0) {
      yield batch;
    }
  }
}

function processBatch(
  files: SlackFile[],
  filterSupported: boolean
): FileSyncBatch {
  const total = files.length;

  const filteredFiles = filterSupported ? filterSupportedFiles(files) : files;

  const downloadableFiles = filteredFiles.filter(hasDownloadUrl);

  const supported = downloadableFiles.length;
  const skipped = total - supported;

  return {
    files: downloadableFiles.map(transformSlackFile),
    hasMore: true,
    stats: {
      total,
      supported,
      skipped,
    },
  };
}

export function getLatestFileTimestamp(
  files: SlackFileInfo[]
): string | undefined {
  if (files.length === 0) {
    return;
  }

  let latest = 0;
  for (const file of files) {
    if (file.createdAt && file.createdAt > latest) {
      latest = file.createdAt;
    }
  }

  return latest > 0 ? String(latest) : undefined;
}
