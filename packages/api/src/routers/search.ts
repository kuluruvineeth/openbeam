import {
  getStorageProvider,
  type MediaSearchRanking,
  type SearchRanking,
  SIGNED_URL_EXPIRY_SECONDS,
  searchService,
} from "@openplane/services";
import { z } from "zod";
import { createTRPCRouter } from "../index";
import { withActiveTeam } from "./apps/middleware";

type MediaWithThumbnail = {
  thumbnail_url?: string;
  metadata?: unknown;
};

function getThumbnailStorageKey(metadata: unknown): string | null {
  if (
    metadata !== null &&
    typeof metadata === "object" &&
    "thumbnailStorageKey" in metadata
  ) {
    const key = (metadata as Record<string, unknown>).thumbnailStorageKey;
    if (typeof key === "string") {
      return key;
    }
  }
  return null;
}

async function generateSignedUrlsForKeys(
  storageKeys: string[]
): Promise<Map<string, string>> {
  if (storageKeys.length === 0) {
    return new Map();
  }

  const storage = getStorageProvider();
  const results = await Promise.all(
    storageKeys.map(async (key) => {
      try {
        const url = await storage.getSignedUrl(key, SIGNED_URL_EXPIRY_SECONDS);
        return [key, url] as const;
      } catch {
        return null;
      }
    })
  );

  const urlMap = new Map<string, string>();
  for (const result of results) {
    if (result) {
      urlMap.set(result[0], result[1]);
    }
  }
  return urlMap;
}

function collectStorageKeys(mediaItems: MediaWithThumbnail[]): string[] {
  const keys: string[] = [];
  for (const media of mediaItems) {
    const key = getThumbnailStorageKey(media.metadata);
    if (key) {
      keys.push(key);
    }
  }
  return keys;
}

function applyThumbnailUrls<T extends MediaWithThumbnail>(
  mediaItems: T[],
  signedUrls: Map<string, string>
): T[] {
  return mediaItems.map((media) => {
    const storageKey = getThumbnailStorageKey(media.metadata);
    if (storageKey && signedUrls.has(storageKey)) {
      return { ...media, thumbnail_url: signedUrls.get(storageKey) };
    }
    return media.thumbnail_url ? media : { ...media, thumbnail_url: undefined };
  });
}

async function enrichMediaWithThumbnails<T extends MediaWithThumbnail>(
  mediaItems: T[]
): Promise<T[]> {
  const storageKeys = collectStorageKeys(mediaItems);
  const signedUrls = await generateSignedUrlsForKeys(storageKeys);
  return applyThumbnailUrls(mediaItems, signedUrls);
}

function buildAccessControlIds(ctx: {
  teamId: string;
  session: { user: { id: string; email?: string | null } };
}): string[] {
  return [
    `team:${ctx.teamId}`,
    ctx.session.user.id,
    ctx.session.user.email,
  ].filter(Boolean) as string[];
}

const searchInputSchema = z.object({
  q: z.string().default(""),
  connectorTypes: z.array(z.string()).optional(),
  documentTypes: z.array(z.string()).optional(),
  sourceTypes: z.array(z.string()).optional(),
  statuses: z.array(z.string()).optional(),
  priorities: z.array(z.string()).optional(),
  labels: z.array(z.string()).optional(),
  connectorId: z.string().optional(),
  authorId: z.string().optional(),
  sourceId: z.string().optional(),
  fromDate: z.number().optional(),
  toDate: z.number().optional(),
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
  cursor: z.number().nullish(),
  ranking: z
    .enum(["bm25", "semantic", "hybrid", "recency", "engagement"])
    .default("hybrid"),
});

const recentInputSchema = z.object({
  hours: z.number().min(1).max(168).default(24),
  limit: z.number().min(1).max(100).default(20),
});

const mediaSearchInputSchema = z.object({
  q: z.string().default(""),
  connectorId: z.string().optional(),
  sourceId: z.string().optional(),
  fromDate: z.number().optional(),
  toDate: z.number().optional(),
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
  cursor: z.number().nullish(),
  ranking: z.enum(["bm25", "semantic", "hybrid"]).default("hybrid"),
});

const unifiedSearchInputSchema = z.object({
  q: z.string().default(""),
  includeDocuments: z.boolean().default(true),
  includeMedia: z.boolean().default(true),
  connectorTypes: z.array(z.string()).optional(),
  connectorId: z.string().optional(),
  documentTypes: z.array(z.string()).optional(),
  sourceTypes: z.array(z.string()).optional(),
  statuses: z.array(z.string()).optional(),
  priorities: z.array(z.string()).optional(),
  labels: z.array(z.string()).optional(),
  authorIds: z.array(z.string()).optional(),
  sourceId: z.string().optional(),
  fromDate: z.number().optional(),
  toDate: z.number().optional(),
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
  cursor: z.number().nullish(),
  ranking: z
    .enum(["bm25", "semantic", "hybrid", "recency", "engagement"])
    .default("hybrid"),
  mediaRanking: z.enum(["bm25", "semantic", "hybrid"]).default("hybrid"),
});

const authorsInputSchema = z.object({
  limit: z.number().min(1).max(100).default(50),
});

export const searchRouter = createTRPCRouter({
  query: withActiveTeam
    .input(searchInputSchema)
    .query(async ({ ctx, input }) => {
      const effectiveOffset = input.cursor ?? input.offset;
      const accessControlIds = buildAccessControlIds(ctx);

      const result = await searchService.search({
        query: input.q,
        teamId: ctx.teamId,
        connectorTypes: input.connectorTypes,
        documentTypes: input.documentTypes,
        sourceTypes: input.sourceTypes,
        statuses: input.statuses,
        priorities: input.priorities,
        labels: input.labels,
        connectorId: input.connectorId,
        authorId: input.authorId,
        sourceId: input.sourceId,
        fromDate: input.fromDate,
        toDate: input.toDate,
        limit: input.limit,
        offset: effectiveOffset,
        ranking: input.ranking as SearchRanking,
        accessControlIds,
      });

      const nextCursor = result.hasMore
        ? result.offset + result.limit
        : undefined;

      return {
        documents: result.documents,
        total: result.total,
        limit: result.limit,
        offset: result.offset,
        hasMore: result.hasMore,
        nextCursor,
        queryTime: result.queryTime,
        query: input.q,
        ranking: input.ranking,
      };
    }),

  recent: withActiveTeam
    .input(recentInputSchema)
    .query(async ({ ctx, input }) => {
      const accessControlIds = buildAccessControlIds(ctx);

      const documents = await searchService.getRecentDocuments({
        teamId: ctx.teamId,
        hours: input.hours,
        limit: input.limit,
        accessControlIds,
      });

      return {
        documents,
        count: documents.length,
      };
    }),

  media: withActiveTeam
    .input(mediaSearchInputSchema)
    .query(async ({ ctx, input }) => {
      const effectiveOffset = input.cursor ?? input.offset;
      const accessControlIds = buildAccessControlIds(ctx);

      const result = await searchService.searchMedia({
        query: input.q,
        teamId: ctx.teamId,
        connectorId: input.connectorId,
        sourceId: input.sourceId,
        fromDate: input.fromDate,
        toDate: input.toDate,
        limit: input.limit,
        offset: effectiveOffset,
        ranking: input.ranking as MediaSearchRanking,
        accessControlIds,
      });

      const media = await enrichMediaWithThumbnails(result.media);

      const nextCursor =
        media.length === input.limit
          ? effectiveOffset + input.limit
          : undefined;

      return {
        media,
        total: result.total,
        limit: input.limit,
        offset: effectiveOffset,
        hasMore: media.length === input.limit,
        nextCursor,
        queryTime: result.queryTime,
        query: input.q,
        ranking: input.ranking,
      };
    }),

  unified: withActiveTeam
    .input(unifiedSearchInputSchema)
    .query(async ({ ctx, input }) => {
      const effectiveOffset = input.cursor ?? input.offset;
      const accessControlIds = buildAccessControlIds(ctx);

      const result = await searchService.searchUnified({
        query: input.q,
        teamId: ctx.teamId,
        includeDocuments: input.includeDocuments,
        includeMedia: input.includeMedia,
        connectorTypes: input.connectorTypes,
        connectorId: input.connectorId,
        documentTypes: input.documentTypes,
        sourceTypes: input.sourceTypes,
        statuses: input.statuses,
        priorities: input.priorities,
        labels: input.labels,
        authorIds: input.authorIds,
        sourceId: input.sourceId,
        fromDate: input.fromDate,
        toDate: input.toDate,
        limit: input.limit,
        offset: effectiveOffset,
        ranking: input.ranking as SearchRanking,
        mediaRanking: input.mediaRanking as MediaSearchRanking,
        accessControlIds,
      });

      const mediaFromItems = result.items
        .filter(
          (item): item is typeof item & { type: "media" } =>
            item.type === "media"
        )
        .map((item) => item.data);
      const allMedia = [...result.media, ...mediaFromItems];

      const storageKeys = collectStorageKeys(allMedia);
      const signedUrls = await generateSignedUrlsForKeys(storageKeys);

      const media = applyThumbnailUrls(result.media, signedUrls);

      const enrichedItems = result.items.map((item) => {
        if (item.type === "media") {
          const storageKey = getThumbnailStorageKey(item.data.metadata);
          const thumbnailUrl = storageKey
            ? signedUrls.get(storageKey)
            : item.data.thumbnail_url;
          return {
            ...item,
            data: { ...item.data, thumbnail_url: thumbnailUrl },
          };
        }
        return item;
      });

      const currentCount = enrichedItems.length;
      const hasMore = effectiveOffset + currentCount < result.total;
      const nextCursor = hasMore ? effectiveOffset + input.limit : undefined;

      return {
        items: enrichedItems,
        documents: result.documents,
        media,
        documentTotal: result.documentTotal,
        mediaTotal: result.mediaTotal,
        total: result.total,
        limit: input.limit,
        offset: effectiveOffset,
        hasMore,
        nextCursor,
        queryTime: result.queryTime,
        query: input.q,
      };
    }),

  authors: withActiveTeam
    .input(authorsInputSchema)
    .query(async ({ ctx, input }) => {
      const accessControlIds = buildAccessControlIds(ctx);

      const authors = await searchService.getAuthorFacets({
        teamId: ctx.teamId,
        accessControlIds,
        limit: input.limit,
      });

      return { authors };
    }),
});
