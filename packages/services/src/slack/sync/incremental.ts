import type { GenericDocument } from "@openplane/vespa";
import type { SlackClient } from "../client";
import type {
  SlackChannel,
  SyncBatch,
  SyncCursor,
  TransformContext,
} from "../types";
import { type SyncChannelsOptions, syncChannels } from "./channels";
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
  } = options;

  if (shouldRunFullSync(cursor, forceFullSync, fullSyncInterval)) {
    return fullSync(client, context, {
      channelOptions,
      messageOptions,
      onChannelsDiscovered,
      disabledChannelIds,
      enabledChannelIds,
    });
  }

  return deltaSync(client, context, {
    cursor: cursor ?? createInitialCursor(),
    channelOptions,
    messageOptions,
    onChannelsDiscovered,
    disabledChannelIds,
    enabledChannelIds,
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
  } = {}
): AsyncGenerator<SyncBatch<GenericDocument>, void, undefined> {
  const {
    channelOptions = {},
    messageOptions = {},
    onChannelsDiscovered,
    disabledChannelIds,
    enabledChannelIds,
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
  }
): AsyncGenerator<SyncBatch<GenericDocument>, void, undefined> {
  const {
    cursor,
    channelOptions = {},
    messageOptions = {},
    onChannelsDiscovered,
    disabledChannelIds,
    enabledChannelIds,
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
