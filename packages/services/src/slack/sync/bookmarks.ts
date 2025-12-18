import type { GenericDocument } from "@openplane/vespa";
import {
  type SlackBookmark as ApiSlackBookmark,
  listAllBookmarks,
} from "../api/bookmarks";
import { createUserLookup } from "../api/users";
import type { SlackClient } from "../client";
import {
  type BookmarkTransformContext,
  type SlackBookmark,
  transformBookmark,
} from "../transformers/bookmark";
import type { SlackChannel, SyncBatch, TransformContext } from "../types";

export interface BookmarkSyncOptions {
  batchSize?: number;
  channels?: SlackChannel[];
}

export async function* syncBookmarksBatched(
  client: SlackClient,
  context: TransformContext,
  options: BookmarkSyncOptions = {}
): AsyncGenerator<SyncBatch<GenericDocument>, void, undefined> {
  const { batchSize = 100, channels = [] } = options;

  if (channels.length === 0) {
    return;
  }

  const userLookup = await createUserLookup(client);
  const channelIds = channels.map((c) => c.id);
  const channelMap = new Map(channels.map((c) => [c.id, c]));

  const batch: GenericDocument[] = [];
  let processed = 0;
  let errors = 0;

  for await (const rawBookmark of listAllBookmarks(client, channelIds)) {
    try {
      const bookmark = mapApiBookmarkToBookmark(rawBookmark);
      const channel = channelMap.get(bookmark.channelId);
      const transformContext: BookmarkTransformContext = {
        ...context,
        userLookup,
        channelName: channel?.name,
      };
      const doc = transformBookmark(bookmark, transformContext);
      batch.push(doc);
      processed += 1;
    } catch {
      errors += 1;
    }

    if (batch.length >= batchSize) {
      yield {
        items: batch.splice(0, batch.length),
        cursor: {},
        hasMore: true,
        stats: { processed, skipped: 0, errors },
      };
    }
  }

  if (batch.length > 0) {
    yield {
      items: batch,
      cursor: {},
      hasMore: false,
      stats: { processed, skipped: 0, errors },
    };
  }
}

function mapApiBookmarkToBookmark(
  apiBookmark: ApiSlackBookmark
): SlackBookmark {
  return {
    id: apiBookmark.id,
    channelId: apiBookmark.channelId,
    title: apiBookmark.title,
    link: apiBookmark.link,
    emoji: apiBookmark.emoji,
    iconUrl: apiBookmark.iconUrl,
    type: apiBookmark.type,
    entityId: apiBookmark.entityId,
    createdBy: apiBookmark.createdBy,
    createdAt: apiBookmark.createdAt,
    updatedAt: apiBookmark.updatedAt,
  };
}
