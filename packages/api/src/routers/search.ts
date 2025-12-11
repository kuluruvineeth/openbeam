import {
  getStorageProvider,
  type SearchRanking,
  SIGNED_URL_EXPIRY_SECONDS,
  searchService,
  type VideoSearchRanking,
} from "@openplane/services";
import { z } from "zod";
import { createTRPCRouter } from "../index";
import { withActiveTeam } from "./apps/middleware";

type VideoWithThumbnail = {
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

async function generateThumbnailUrl(
  video: VideoWithThumbnail
): Promise<string | undefined> {
  const storageKey = getThumbnailStorageKey(video.metadata);

  if (!storageKey) {
    return video.thumbnail_url || undefined;
  }

  try {
    return await getStorageProvider().getSignedUrl(
      storageKey,
      SIGNED_URL_EXPIRY_SECONDS
    );
  } catch {
    return;
  }
}

async function enrichVideosWithThumbnails<T extends VideoWithThumbnail>(
  videos: T[]
): Promise<T[]> {
  return await Promise.all(
    videos.map(async (video) => ({
      ...video,
      thumbnail_url: await generateThumbnailUrl(video),
    }))
  );
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

const videoSearchInputSchema = z.object({
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
  includeVideos: z.boolean().default(true),
  connectorTypes: z.array(z.string()).optional(),
  connectorId: z.string().optional(),
  documentTypes: z.array(z.string()).optional(),
  sourceId: z.string().optional(),
  fromDate: z.number().optional(),
  toDate: z.number().optional(),
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
  cursor: z.number().nullish(),
  ranking: z
    .enum(["bm25", "semantic", "hybrid", "recency", "engagement"])
    .default("hybrid"),
  videoRanking: z.enum(["bm25", "semantic", "hybrid"]).default("hybrid"),
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

  videos: withActiveTeam
    .input(videoSearchInputSchema)
    .query(async ({ ctx, input }) => {
      const effectiveOffset = input.cursor ?? input.offset;
      const accessControlIds = buildAccessControlIds(ctx);

      const result = await searchService.searchVideos({
        query: input.q,
        teamId: ctx.teamId,
        connectorId: input.connectorId,
        sourceId: input.sourceId,
        fromDate: input.fromDate,
        toDate: input.toDate,
        limit: input.limit,
        offset: effectiveOffset,
        ranking: input.ranking as VideoSearchRanking,
        accessControlIds,
      });

      const videos = await enrichVideosWithThumbnails(result.videos);

      const nextCursor =
        videos.length === input.limit
          ? effectiveOffset + input.limit
          : undefined;

      return {
        videos,
        total: result.total,
        limit: input.limit,
        offset: effectiveOffset,
        hasMore: videos.length === input.limit,
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
        includeVideos: input.includeVideos,
        connectorTypes: input.connectorTypes,
        connectorId: input.connectorId,
        documentTypes: input.documentTypes,
        sourceId: input.sourceId,
        fromDate: input.fromDate,
        toDate: input.toDate,
        limit: input.limit,
        offset: effectiveOffset,
        ranking: input.ranking as SearchRanking,
        videoRanking: input.videoRanking as VideoSearchRanking,
        accessControlIds,
      });

      const videos = await enrichVideosWithThumbnails(result.videos);

      const enrichedItems = await Promise.all(
        result.items.map(async (item) => {
          if (item.type === "video") {
            return {
              ...item,
              data: {
                ...item.data,
                thumbnail_url: await generateThumbnailUrl(item.data),
              },
            };
          }
          return item;
        })
      );

      const currentCount = enrichedItems.length;
      const hasMore = effectiveOffset + currentCount < result.total;
      const nextCursor = hasMore ? effectiveOffset + input.limit : undefined;

      return {
        items: enrichedItems,
        documents: result.documents,
        videos,
        documentTotal: result.documentTotal,
        videoTotal: result.videoTotal,
        total: result.total,
        limit: input.limit,
        offset: effectiveOffset,
        hasMore,
        nextCursor,
        queryTime: result.queryTime,
        query: input.q,
      };
    }),
});
