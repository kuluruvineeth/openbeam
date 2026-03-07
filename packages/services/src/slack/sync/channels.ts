import type {
  SlackChannel,
  SlackSyncBatch as SyncBatch,
  TransformContext,
} from "@openbeam/types/services/connectors/slack";
import type { Entity } from "@openbeam/vespa";
import {
  buildChannelMemberMap,
  getAccessibleChannels,
  type ListChannelsOptions,
} from "../api/channels";
import type { SlackClient } from "../client";
import { shouldIndex, transformChannels } from "../transformers";

export interface SyncChannelsOptions {
  types?: Array<"public" | "private" | "im" | "mpim">;
  indexPrivate?: boolean;
  indexDms?: boolean;
  indexGroupDms?: boolean;
  batchSize?: number;
}

export interface ChannelSyncResult {
  channels: Entity[];
  channelData: SlackChannel[];
  memberMap: Map<string, string[]>;
  stats: {
    total: number;
    accessible: number;
    indexed: number;
    skipped: number;
  };
}

export async function syncChannels(
  client: SlackClient,
  context: TransformContext,
  options: SyncChannelsOptions = {}
): Promise<ChannelSyncResult> {
  const {
    types: providedTypes,
    indexPrivate = false,
    indexDms = false,
    indexGroupDms = false,
  } = options;

  const types = providedTypes ?? buildChannelTypes({ indexDms, indexGroupDms });

  const stats = {
    total: 0,
    accessible: 0,
    indexed: 0,
    skipped: 0,
  };

  const apiTypes = mapChannelTypes(types);

  const listOptions: ListChannelsOptions = {
    types: apiTypes,
    memberOnly: true,
  };

  const accessibleChannels = await getAccessibleChannels(client, listOptions);
  stats.accessible = accessibleChannels.length;

  const indexSettings = { indexPrivate, indexDms, indexGroupDms };
  const channelsToIndex = accessibleChannels.filter((channel) =>
    shouldIndex(channel, indexSettings)
  );
  stats.indexed = channelsToIndex.length;
  stats.skipped = stats.accessible - stats.indexed;

  const memberMap = await buildChannelMemberMap(client, channelsToIndex);

  const channelEntities = transformChannels(
    channelsToIndex,
    context,
    memberMap
  );

  return {
    channels: channelEntities,
    channelData: channelsToIndex,
    memberMap,
    stats,
  };
}

export async function* syncChannelsBatched(
  client: SlackClient,
  context: TransformContext,
  options: SyncChannelsOptions = {}
): AsyncGenerator<SyncBatch<Entity>, void, undefined> {
  const { batchSize = 100, ...syncOptions } = options;

  const result = await syncChannels(client, context, syncOptions);

  for (let i = 0; i < result.channels.length; i += batchSize) {
    const batch = result.channels.slice(i, i + batchSize);
    const isLast = i + batchSize >= result.channels.length;

    yield {
      items: batch,
      cursor: {
        lastFullSync: Date.now(),
      },
      hasMore: !isLast,
      stats: {
        processed: batch.length,
        skipped: 0,
        errors: 0,
      },
    };
  }
}

export async function getChangedChannels(
  client: SlackClient,
  previousChannels: SlackChannel[],
  options: SyncChannelsOptions = {}
): Promise<{
  added: SlackChannel[];
  removed: SlackChannel[];
  unchanged: SlackChannel[];
}> {
  const {
    types: providedTypes,
    indexPrivate = false,
    indexDms = false,
    indexGroupDms = false,
  } = options;

  const types = providedTypes ?? buildChannelTypes({ indexDms, indexGroupDms });
  const apiTypes = mapChannelTypes(types);
  const currentChannels = await getAccessibleChannels(client, {
    types: apiTypes,
  });

  const indexSettings = { indexPrivate, indexDms, indexGroupDms };
  const currentIndexable = currentChannels.filter((c) =>
    shouldIndex(c, indexSettings)
  );
  const previousIndexable = previousChannels.filter((c) =>
    shouldIndex(c, indexSettings)
  );

  const previousIds = new Set(previousIndexable.map((c) => c.id));
  const currentIds = new Set(currentIndexable.map((c) => c.id));

  const added = currentIndexable.filter((c) => !previousIds.has(c.id));
  const removed = previousIndexable.filter((c) => !currentIds.has(c.id));
  const unchanged = currentIndexable.filter((c) => previousIds.has(c.id));

  return { added, removed, unchanged };
}

function buildChannelTypes(options: {
  indexDms?: boolean;
  indexGroupDms?: boolean;
}): Array<"public" | "private" | "im" | "mpim"> {
  const types: Array<"public" | "private" | "im" | "mpim"> = [
    "public",
    "private",
  ];
  if (options.indexDms) {
    types.push("im");
  }
  if (options.indexGroupDms) {
    types.push("mpim");
  }
  return types;
}

function mapChannelTypes(
  types: Array<"public" | "private" | "im" | "mpim">
): Array<"public_channel" | "private_channel" | "im" | "mpim"> {
  return types.map((type) => {
    switch (type) {
      case "public":
        return "public_channel";
      case "private":
        return "private_channel";
      default:
        return type;
    }
  });
}
