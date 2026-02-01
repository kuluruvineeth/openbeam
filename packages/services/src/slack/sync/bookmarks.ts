import type {
  SlackChannel,
  SlackSyncBatch as SyncBatch,
  TransformContext,
} from "@openplane/types/services/connectors/slack";
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

export interface BookmarkSyncOptions {
  batchSize?: number;
  channels?: SlackChannel[];
  since?: number;
}

function getBookmarkTimestamp(bookmark: SlackBookmark): number {
  return bookmark.updatedAt ?? bookmark.createdAt;
}

function shouldSkipBookmark(bookmark: SlackBookmark, sinceMs: number): boolean {
  if (!sinceMs) {
    return false;
  }
  return getBookmarkTimestamp(bookmark) <= sinceMs;
}

export async function* syncBookmarksBatched(
  client: SlackClient,
  context: TransformContext,
  options: BookmarkSyncOptions = {}
): AsyncGenerator<SyncBatch<GenericDocument>, void, undefined> {
  const { batchSize = 100, channels = [], since } = options;

  if (channels.length === 0) {
    return;
  }

  const userLookup = await createUserLookup(client);
  const channelIds = channels.map((c) => c.id);
  const channelMap = new Map(channels.map((c) => [c.id, c]));

  const batch: GenericDocument[] = [];
  let processed = 0;
  let skipped = 0;
  let errors = 0;
  let latestTimestamp = since ?? 0;
  const sinceMs = since ? since * 1000 : 0;

  for await (const rawBookmark of listAllBookmarks(client, channelIds)) {
    try {
      const bookmark = mapApiBookmarkToBookmark(rawBookmark);

      if (shouldSkipBookmark(bookmark, sinceMs)) {
        skipped += 1;
        continue;
      }

      const channel = channelMap.get(bookmark.channelId);
      const transformContext: BookmarkTransformContext = {
        ...context,
        userLookup,
        channelName: channel?.name,
      };
      const doc = await transformBookmark(bookmark, transformContext);
      batch.push(doc);
      processed += 1;

      const bookmarkTimestamp = Math.floor(
        getBookmarkTimestamp(bookmark) / 1000
      );
      latestTimestamp = Math.max(latestTimestamp, bookmarkTimestamp);
    } catch {
      errors += 1;
    }

    if (batch.length >= batchSize) {
      yield {
        items: batch.splice(0, batch.length),
        cursor: { lastBookmarkSyncTimestamp: latestTimestamp },
        hasMore: true,
        stats: { processed, skipped, errors },
      };
    }
  }

  const finalTimestamp = latestTimestamp || Math.floor(Date.now() / 1000);
  if (batch.length > 0 || processed === 0) {
    yield {
      items: batch,
      cursor: { lastBookmarkSyncTimestamp: finalTimestamp },
      hasMore: false,
      stats: { processed, skipped, errors },
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
