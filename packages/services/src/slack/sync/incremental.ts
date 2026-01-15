import type {
  SlackChannel,
  SlackSyncBatch as SyncBatch,
  SyncCursor,
  TransformContext,
} from "@openplane/types/services/connectors/slack";
import type { GenericDocument } from "@openplane/vespa";
import type { ConnectorFileInfo } from "../../files";
import type { SlackClient } from "../client";
import { type BookmarkSyncOptions, syncBookmarksBatched } from "./bookmarks";
import { type CanvasSyncOptions, syncCanvasesBatched } from "./canvas";
import { type SyncChannelsOptions, syncChannels } from "./channels";
import { type ClipSyncOptions, syncClipsBatched } from "./clips";
import {
  type FileSyncOptions,
  getLatestFileTimestamp,
  syncFiles,
} from "./files";
import { type SyncMessagesOptions, syncMultipleChannels } from "./messages";

function filterChannelsByConfig(
  channels: SlackChannel[],
  disabledChannelIds?: Set<string>,
  enabledChannelIds?: Set<string>
): { filtered: SlackChannel[]; excluded: SlackChannel[] } {
  if (disabledChannelIds && disabledChannelIds.size > 0) {
    const filtered = channels.filter((ch) => !disabledChannelIds.has(ch.id));
    const excluded = channels.filter((ch) => disabledChannelIds.has(ch.id));
    return { filtered, excluded };
  }

  if (enabledChannelIds && enabledChannelIds.size > 0) {
    const filtered = channels.filter((ch) => enabledChannelIds.has(ch.id));
    const excluded = channels.filter((ch) => !enabledChannelIds.has(ch.id));
    return { filtered, excluded };
  }

  return { filtered: channels, excluded: [] };
}

export interface IncrementalSyncOptions {
  cursor?: SyncCursor;
  channelOptions?: SyncChannelsOptions;
  messageOptions?: Omit<SyncMessagesOptions, "cursor">;
  forceFullSync?: boolean;
  fullSyncInterval?: number;
  onChannelsDiscovered?: (channels: SlackChannel[]) => Promise<void>;
  disabledChannelIds?: Set<string>;
  enabledChannelIds?: Set<string>;
  syncFiles?: boolean;
  fileOptions?: Omit<FileSyncOptions, "lastSyncTimestamp">;
  onFilesDiscovered?: (files: ConnectorFileInfo[]) => Promise<void>;
  syncCanvases?: boolean;
  canvasOptions?: Omit<CanvasSyncOptions, "channelId">;
  syncClips?: boolean;
  clipOptions?: Omit<ClipSyncOptions, "channelId">;
  syncBookmarks?: boolean;
  bookmarkOptions?: Omit<BookmarkSyncOptions, "channels">;
}

export interface SyncProgressCallback {
  onChannelStart?: (
    channel: SlackChannel,
    index: number,
    total: number
  ) => void;
  onChannelComplete?: (
    channel: SlackChannel,
    docsCount: number,
    index: number,
    total: number
  ) => void;
  onBatch?: (batch: SyncBatch<GenericDocument>, channel: SlackChannel) => void;
  onError?: (error: Error, channel?: SlackChannel) => void;
}

export interface FullSyncResult {
  cursor: SyncCursor;
  totalDocuments: number;
  channelCount: number;
  channelStats: Map<
    string,
    {
      documents: number;
      latestTimestamp?: string;
    }
  >;
}

function shouldRunFullSync(
  cursor: SyncCursor | undefined,
  forceFullSync: boolean,
  fullSyncInterval: number
): boolean {
  return (
    forceFullSync ||
    !cursor?.lastFullSync ||
    Date.now() - cursor.lastFullSync > fullSyncInterval
  );
}

export function incrementalSync(
  client: SlackClient,
  context: TransformContext,
  options: IncrementalSyncOptions = {}
): AsyncGenerator<SyncBatch<GenericDocument>, void, undefined> {
  const {
    cursor,
    channelOptions = {},
    messageOptions = {},
    forceFullSync = false,
    fullSyncInterval = 24 * 60 * 60 * 1000, // 24 hours
    onChannelsDiscovered,
    disabledChannelIds,
    enabledChannelIds,
    syncFiles: shouldSyncFiles = false,
    fileOptions = {},
    onFilesDiscovered,
    syncCanvases: shouldSyncCanvases = false,
    canvasOptions = {},
    syncClips: shouldSyncClips = false,
    clipOptions = {},
    syncBookmarks: shouldSyncBookmarks = false,
    bookmarkOptions = {},
  } = options;

  if (shouldRunFullSync(cursor, forceFullSync, fullSyncInterval)) {
    return fullSync(client, context, {
      channelOptions,
      messageOptions,
      onChannelsDiscovered,
      disabledChannelIds,
      enabledChannelIds,
      syncFiles: shouldSyncFiles,
      fileOptions,
      onFilesDiscovered,
      syncCanvases: shouldSyncCanvases,
      canvasOptions,
      syncClips: shouldSyncClips,
      clipOptions,
      syncBookmarks: shouldSyncBookmarks,
      bookmarkOptions,
    });
  }

  return deltaSync(client, context, {
    cursor: cursor ?? createInitialCursor(),
    channelOptions,
    messageOptions,
    onChannelsDiscovered,
    disabledChannelIds,
    enabledChannelIds,
    syncFiles: shouldSyncFiles,
    fileOptions,
    onFilesDiscovered,
    syncCanvases: shouldSyncCanvases,
    canvasOptions,
    syncClips: shouldSyncClips,
    clipOptions,
    syncBookmarks: shouldSyncBookmarks,
    bookmarkOptions,
  });
}

export async function* fullSync(
  client: SlackClient,
  context: TransformContext,
  options: {
    channelOptions?: SyncChannelsOptions;
    messageOptions?: Omit<SyncMessagesOptions, "cursor">;
    onChannelsDiscovered?: (channels: SlackChannel[]) => Promise<void>;
    disabledChannelIds?: Set<string>;
    enabledChannelIds?: Set<string>;
    syncFiles?: boolean;
    fileOptions?: Omit<FileSyncOptions, "lastSyncTimestamp">;
    onFilesDiscovered?: (files: ConnectorFileInfo[]) => Promise<void>;
    syncCanvases?: boolean;
    canvasOptions?: Omit<CanvasSyncOptions, "channelId">;
    syncClips?: boolean;
    clipOptions?: Omit<ClipSyncOptions, "channelId">;
    syncBookmarks?: boolean;
    bookmarkOptions?: Omit<BookmarkSyncOptions, "channels">;
  } = {}
): AsyncGenerator<SyncBatch<GenericDocument>, void, undefined> {
  const {
    channelOptions = {},
    messageOptions = {},
    onChannelsDiscovered,
    disabledChannelIds,
    enabledChannelIds,
    syncFiles: shouldSyncFiles = false,
    fileOptions = {},
    onFilesDiscovered,
    syncCanvases: shouldSyncCanvases = false,
    canvasOptions = {},
    syncClips: shouldSyncClips = false,
    clipOptions = {},
    syncBookmarks: shouldSyncBookmarks = false,
    bookmarkOptions = {},
  } = options;

  const channelResult = await syncChannels(client, context, channelOptions);

  if (onChannelsDiscovered) {
    await onChannelsDiscovered(channelResult.channelData);
  }

  const { filtered: channelsToSync } = filterChannelsByConfig(
    channelResult.channelData,
    disabledChannelIds,
    enabledChannelIds
  );

  yield* syncMultipleChannels(client, channelsToSync, context, {
    ...messageOptions,
    memberMap: channelResult.memberMap,
    cursor: { lastFullSync: Date.now() },
  });

  if (shouldSyncFiles && onFilesDiscovered) {
    yield* syncFilesWithCallback(client, context, {
      ...fileOptions,
      onFilesDiscovered,
    });
  }

  if (shouldSyncCanvases) {
    yield* syncCanvasesBatched(client, context, canvasOptions);
  }

  if (shouldSyncClips) {
    yield* syncClipsBatched(client, context, clipOptions);
  }

  if (shouldSyncBookmarks) {
    yield* syncBookmarksBatched(client, context, {
      ...bookmarkOptions,
      channels: channelsToSync,
    });
  }
}

export async function* deltaSync(
  client: SlackClient,
  context: TransformContext,
  options: {
    cursor: SyncCursor;
    channelOptions?: SyncChannelsOptions;
    messageOptions?: Omit<SyncMessagesOptions, "cursor">;
    onChannelsDiscovered?: (channels: SlackChannel[]) => Promise<void>;
    disabledChannelIds?: Set<string>;
    enabledChannelIds?: Set<string>;
    syncFiles?: boolean;
    fileOptions?: Omit<FileSyncOptions, "lastSyncTimestamp">;
    onFilesDiscovered?: (files: ConnectorFileInfo[]) => Promise<void>;
    syncCanvases?: boolean;
    canvasOptions?: Omit<CanvasSyncOptions, "channelId">;
    syncClips?: boolean;
    clipOptions?: Omit<ClipSyncOptions, "channelId">;
    syncBookmarks?: boolean;
    bookmarkOptions?: Omit<BookmarkSyncOptions, "channels">;
  }
): AsyncGenerator<SyncBatch<GenericDocument>, void, undefined> {
  const {
    cursor,
    channelOptions = {},
    messageOptions = {},
    onChannelsDiscovered,
    disabledChannelIds,
    enabledChannelIds,
    syncFiles: shouldSyncFiles = false,
    fileOptions = {},
    onFilesDiscovered,
    syncCanvases: shouldSyncCanvases = false,
    canvasOptions = {},
    syncClips: shouldSyncClips = false,
    clipOptions = {},
    syncBookmarks: shouldSyncBookmarks = false,
    bookmarkOptions = {},
  } = options;

  const channelResult = await syncChannels(client, context, channelOptions);

  if (onChannelsDiscovered) {
    await onChannelsDiscovered(channelResult.channelData);
  }

  const { filtered: channelsToSync } = filterChannelsByConfig(
    channelResult.channelData,
    disabledChannelIds,
    enabledChannelIds
  );

  yield* syncMultipleChannels(client, channelsToSync, context, {
    ...messageOptions,
    memberMap: channelResult.memberMap,
    cursor,
  });

  if (shouldSyncFiles && onFilesDiscovered) {
    yield* syncFilesWithCallback(client, context, {
      ...fileOptions,
      lastSyncTimestamp: cursor.lastFileSyncTimestamp,
      onFilesDiscovered,
    });
  }

  if (shouldSyncCanvases) {
    yield* syncCanvasesBatched(client, context, {
      ...canvasOptions,
      since: cursor.lastCanvasSyncTimestamp,
    });
  }

  if (shouldSyncClips) {
    yield* syncClipsBatched(client, context, {
      ...clipOptions,
      since: cursor.lastClipSyncTimestamp,
    });
  }

  if (shouldSyncBookmarks) {
    yield* syncBookmarksBatched(client, context, {
      ...bookmarkOptions,
      channels: channelsToSync,
      since: cursor.lastBookmarkSyncTimestamp,
    });
  }
}

async function* syncFilesWithCallback(
  client: SlackClient,
  context: TransformContext,
  options: FileSyncOptions & {
    onFilesDiscovered: (files: ConnectorFileInfo[]) => Promise<void>;
  }
): AsyncGenerator<SyncBatch<GenericDocument>, void, undefined> {
  const { onFilesDiscovered, ...fileOptions } = options;

  let latestTimestamp: string | undefined;

  for await (const batch of syncFiles(client, context, fileOptions)) {
    if (batch.files.length > 0) {
      await onFilesDiscovered(batch.files);

      const batchLatest = getLatestFileTimestamp(batch.files);
      if (
        batchLatest &&
        (!latestTimestamp || Number(batchLatest) > Number(latestTimestamp))
      ) {
        latestTimestamp = batchLatest;
      }
    }

    yield {
      items: [],
      cursor: {
        lastFileSyncTimestamp: latestTimestamp,
      },
      hasMore: batch.hasMore,
      stats: {
        processed: batch.stats.supported,
        skipped: batch.stats.skipped,
        errors: 0,
      },
    };
  }
}

export function createInitialCursor(): SyncCursor {
  return {
    lastFullSync: undefined,
    lastTimestamp: undefined,
    channelCursors: {},
  };
}

export function mergeCursors(
  existing: SyncCursor,
  update: Partial<SyncCursor>
): SyncCursor {
  return {
    ...existing,
    ...update,
    channelCursors: {
      ...existing.channelCursors,
      ...update.channelCursors,
    },
  };
}

export function needsFullSync(
  cursor: SyncCursor | undefined,
  fullSyncInterval: number = 24 * 60 * 60 * 1000
): boolean {
  if (!cursor) {
    return true;
  }

  if (!cursor.lastFullSync) {
    return true;
  }

  return Date.now() - cursor.lastFullSync > fullSyncInterval;
}

export function getLatestCursorTimestamp(
  cursor: SyncCursor
): string | undefined {
  let latest = cursor.lastTimestamp;

  if (cursor.channelCursors) {
    for (const ts of Object.values(cursor.channelCursors)) {
      if (ts && (!latest || Number(ts) > Number(latest))) {
        latest = ts;
      }
    }
  }

  return latest;
}

export interface SyncStatsAccumulator {
  startTime: number;
  documentsProcessed: number;
  channelsProcessed: number;
  errorsCount: number;
  batches: number;
}

export function createStatsAccumulator(): SyncStatsAccumulator {
  return {
    startTime: Date.now(),
    documentsProcessed: 0,
    channelsProcessed: 0,
    errorsCount: 0,
    batches: 0,
  };
}

export function updateStats(
  stats: SyncStatsAccumulator,
  batch: SyncBatch<GenericDocument>
): void {
  stats.documentsProcessed += batch.items.length;
  stats.batches += 1;
  stats.errorsCount += batch.stats.errors;
}

export function finalizeStats(stats: SyncStatsAccumulator): {
  duration: number;
  documentsProcessed: number;
  channelsProcessed: number;
  errorsCount: number;
  batches: number;
  throughput: number;
} {
  const duration = Date.now() - stats.startTime;
  return {
    ...stats,
    duration,
    throughput: duration > 0 ? (stats.documentsProcessed / duration) * 1000 : 0,
  };
}
