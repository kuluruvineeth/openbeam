import type { SlackClient } from "../client";

export interface SlackBookmark {
  id: string;
  channelId: string;
  title: string;
  link?: string;
  emoji?: string;
  iconUrl?: string;
  type: BookmarkType;
  entityId?: string;
  createdBy: string;
  createdAt: number;
  updatedAt?: number;
}

export type BookmarkType = "link" | "message" | "canvas" | "file";

interface BookmarksListResponse {
  ok: boolean;
  bookmarks?: Array<{
    id: string;
    channel_id: string;
    title: string;
    link?: string;
    emoji?: string;
    icon_url?: string;
    type: string;
    entity_id?: string;
    date_created: number;
    date_updated?: number;
    created_by?: string;
  }>;
  error?: string;
}

interface BookmarksAddResponse {
  ok: boolean;
  bookmark?: {
    id: string;
    channel_id: string;
    title: string;
    type: string;
  };
  error?: string;
}

export async function listBookmarks(
  client: SlackClient,
  channelId: string
): Promise<SlackBookmark[]> {
  const response = await client.call<BookmarksListResponse>("bookmarks.list", {
    channel_id: channelId,
  });

  if (!(response.ok && response.bookmarks)) {
    return [];
  }

  return response.bookmarks.map((b) => ({
    id: b.id,
    channelId: b.channel_id,
    title: b.title,
    link: b.link,
    emoji: b.emoji,
    iconUrl: b.icon_url,
    type: mapBookmarkType(b.type),
    entityId: b.entity_id,
    createdBy: b.created_by ?? "",
    createdAt: b.date_created * 1000,
    updatedAt: b.date_updated ? b.date_updated * 1000 : undefined,
  }));
}

export async function listBookmarksForChannels(
  client: SlackClient,
  channelIds: string[],
  options: { concurrency?: number } = {}
): Promise<Map<string, SlackBookmark[]>> {
  const { concurrency = 5 } = options;
  const result = new Map<string, SlackBookmark[]>();

  for (let i = 0; i < channelIds.length; i += concurrency) {
    const batch = channelIds.slice(i, i + concurrency);
    const results = await Promise.all(
      batch.map(async (channelId) => {
        const bookmarks = await listBookmarks(client, channelId).catch(
          () => [] as SlackBookmark[]
        );
        return { channelId, bookmarks };
      })
    );

    for (const { channelId, bookmarks } of results) {
      result.set(channelId, bookmarks);
    }
  }

  return result;
}

export async function* listAllBookmarks(
  client: SlackClient,
  channelIds: string[],
  options: { concurrency?: number } = {}
): AsyncGenerator<SlackBookmark> {
  const { concurrency = 5 } = options;

  for (let i = 0; i < channelIds.length; i += concurrency) {
    const batch = channelIds.slice(i, i + concurrency);
    const results = await Promise.all(
      batch.map((channelId) =>
        listBookmarks(client, channelId).catch(() => [] as SlackBookmark[])
      )
    );

    for (const bookmarks of results) {
      for (const bookmark of bookmarks) {
        yield bookmark;
      }
    }
  }
}

export async function addBookmark(
  client: SlackClient,
  channelId: string,
  params: {
    title: string;
    type: BookmarkType;
    link?: string;
    emoji?: string;
    entityId?: string;
  }
): Promise<SlackBookmark | null> {
  const apiParams: Record<string, unknown> = {
    channel_id: channelId,
    title: params.title,
    type: params.type,
  };

  if (params.link) {
    apiParams.link = params.link;
  }

  if (params.emoji) {
    apiParams.emoji = params.emoji;
  }

  if (params.entityId) {
    apiParams.entity_id = params.entityId;
  }

  const response = await client.call<BookmarksAddResponse>(
    "bookmarks.add",
    apiParams
  );

  if (!(response.ok && response.bookmark)) {
    return null;
  }

  return {
    id: response.bookmark.id,
    channelId: response.bookmark.channel_id,
    title: response.bookmark.title,
    type: mapBookmarkType(response.bookmark.type),
    createdBy: "",
    createdAt: Date.now(),
  };
}

export async function removeBookmark(
  client: SlackClient,
  channelId: string,
  bookmarkId: string
): Promise<boolean> {
  try {
    const response = await client.call<{ ok: boolean; error?: string }>(
      "bookmarks.remove",
      {
        channel_id: channelId,
        bookmark_id: bookmarkId,
      }
    );
    return response.ok;
  } catch {
    return false;
  }
}

export interface BookmarkSyncResult {
  channelId: string;
  bookmarkCount: number;
  linkBookmarks: number;
  messageBookmarks: number;
  canvasBookmarks: number;
  fileBookmarks: number;
  error?: string;
}

export async function syncBookmarks(
  client: SlackClient,
  channelId: string
): Promise<BookmarkSyncResult> {
  try {
    const bookmarks = await listBookmarks(client, channelId);

    const counts = {
      link: 0,
      message: 0,
      canvas: 0,
      file: 0,
    };

    for (const bookmark of bookmarks) {
      counts[bookmark.type] += 1;
    }

    return {
      channelId,
      bookmarkCount: bookmarks.length,
      linkBookmarks: counts.link,
      messageBookmarks: counts.message,
      canvasBookmarks: counts.canvas,
      fileBookmarks: counts.file,
    };
  } catch (error) {
    return {
      channelId,
      bookmarkCount: 0,
      linkBookmarks: 0,
      messageBookmarks: 0,
      canvasBookmarks: 0,
      fileBookmarks: 0,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function syncAllBookmarks(
  client: SlackClient,
  channelIds: string[],
  options: { concurrency?: number } = {}
): Promise<BookmarkSyncResult[]> {
  const { concurrency = 5 } = options;
  const allResults: BookmarkSyncResult[] = [];

  for (let i = 0; i < channelIds.length; i += concurrency) {
    const batch = channelIds.slice(i, i + concurrency);
    const results = await Promise.all(
      batch.map((channelId) => syncBookmarks(client, channelId))
    );
    allResults.push(...results);
  }

  return allResults;
}

function mapBookmarkType(type: string): BookmarkType {
  switch (type) {
    case "link":
      return "link";
    case "message":
      return "message";
    case "canvas":
      return "canvas";
    case "file":
      return "file";
    default:
      return "link";
  }
}

export function transformBookmarkToDocument(
  bookmark: SlackBookmark,
  connectorId: string,
  teamId: string
): {
  externalId: string;
  title: string;
  content: string;
  documentType: string;
  url: string;
  metadata: Record<string, unknown>;
} {
  return {
    externalId: `bookmark_${bookmark.id}`,
    title: bookmark.title,
    content: `Bookmark: ${bookmark.title}${bookmark.link ? ` - ${bookmark.link}` : ""}`,
    documentType: "bookmark",
    url: bookmark.link ?? buildBookmarkUrl(bookmark.channelId, bookmark.id),
    metadata: {
      connectorId,
      teamId,
      bookmarkId: bookmark.id,
      channelId: bookmark.channelId,
      bookmarkType: bookmark.type,
      entityId: bookmark.entityId,
      emoji: bookmark.emoji,
      createdBy: bookmark.createdBy,
      createdAt: bookmark.createdAt,
      updatedAt: bookmark.updatedAt,
    },
  };
}

function buildBookmarkUrl(channelId: string, bookmarkId: string): string {
  return `https://slack.com/archives/${channelId}/bookmark/${bookmarkId}`;
}

export function filterBookmarksByType(
  bookmarks: SlackBookmark[],
  types: BookmarkType[]
): SlackBookmark[] {
  return bookmarks.filter((b) => types.includes(b.type));
}

export function groupBookmarksByChannel(
  bookmarks: SlackBookmark[]
): Map<string, SlackBookmark[]> {
  const grouped = new Map<string, SlackBookmark[]>();

  for (const bookmark of bookmarks) {
    const existing = grouped.get(bookmark.channelId) ?? [];
    existing.push(bookmark);
    grouped.set(bookmark.channelId, existing);
  }

  return grouped;
}
