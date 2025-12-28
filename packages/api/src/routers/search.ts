import {
  getStorageProvider,
  hybridSearchOrchestrator,
  type MediaSearchRanking,
  type RerankDocument,
  rerankerService,
  type SearchMode,
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
    const signedUrl = storageKey ? signedUrls.get(storageKey) : undefined;
    if (signedUrl) {
      return { ...media, thumbnail_url: signedUrl };
    }
    return media;
  });
}

async function enrichMediaWithThumbnails<T extends MediaWithThumbnail>(
  mediaItems: T[]
): Promise<T[]> {
  const storageKeys = collectStorageKeys(mediaItems);
  const signedUrls = await generateSignedUrlsForKeys(storageKeys);
  return applyThumbnailUrls(mediaItems, signedUrls);
}

type UnifiedItem = {
  type: "document" | "media";
  data: MediaWithThumbnail;
  relevance: number;
};

function applyThumbnailUrlsToItems<T extends UnifiedItem>(
  items: T[],
  signedUrls: Map<string, string>
): T[] {
  return items.map((item) => {
    if (item.type !== "media") {
      return item;
    }
    const storageKey = getThumbnailStorageKey(item.data.metadata);
    const signedUrl = storageKey ? signedUrls.get(storageKey) : undefined;
    if (signedUrl) {
      return { ...item, data: { ...item.data, thumbnail_url: signedUrl } };
    }
    return item;
  });
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

const RERANK_CONTENT_MAX_LENGTH = 2000;
const MEDIA_DEFAULT_SCORE = 0.5;

type ScoredRef = { type: "document" | "media"; id: string; score: number };

function parseRerankId(prefixedId: string, score: number): ScoredRef {
  const colonIdx = prefixedId.indexOf(":");
  const prefix = prefixedId.slice(0, colonIdx);
  return {
    type: prefix === "doc" ? "document" : "media",
    id: prefixedId.slice(colonIdx + 1),
    score,
  };
}

interface UnifiedRerankParams {
  query: string;
  teamId: string;
  limit: number;
  offset: number;
  includeMedia: boolean;
  mediaRanking: MediaSearchRanking;
  accessControlIds: string[];
  filters: {
    connectorTypes?: string[];
    documentTypes?: string[];
    authorIds?: string[];
    connectorId?: string;
    sourceId?: string;
    fromDate?: number;
    toDate?: number;
  };
}

async function unifiedSearchWithRerank(params: UnifiedRerankParams) {
  const candidateLimit = Math.max(params.limit * 3, 100);

  const mediaSearchPromise = params.includeMedia
    ? searchService
        .searchMedia({
          query: params.query,
          teamId: params.teamId,
          connectorId: params.filters.connectorId,
          sourceId: params.filters.sourceId,
          fromDate: params.filters.fromDate,
          toDate: params.filters.toDate,
          limit: candidateLimit,
          offset: 0,
          ranking: params.mediaRanking,
          accessControlIds: params.accessControlIds,
        })
        .catch(() => ({ media: [], total: 0, queryTime: 0 }))
    : Promise.resolve({ media: [], total: 0, queryTime: 0 });

  const [orchestratorResult, mediaResult] = await Promise.all([
    hybridSearchOrchestrator.search({
      query: params.query,
      teamId: params.teamId,
      mode: "hybrid_v2",
      limit: candidateLimit,
      offset: 0,
      filters: {
        connectorTypes: params.filters.connectorTypes,
        documentTypes: params.filters.documentTypes,
        authorIds: params.filters.authorIds,
        fromDate: params.filters.fromDate,
        toDate: params.filters.toDate,
      },
      accessControlIds: params.accessControlIds,
    }),
    mediaSearchPromise,
  ]);

  const docCandidates: RerankDocument[] = orchestratorResult.documents.map(
    (doc, idx) => ({
      id: `doc:${doc.document.id}`,
      content: doc.document.content?.slice(0, RERANK_CONTENT_MAX_LENGTH) ?? "",
      title: doc.document.title,
      score: doc.score,
      rank: idx + 1,
    })
  );

  const mediaCandidates: RerankDocument[] = mediaResult.media.map((m, idx) => ({
    id: `media:${m.id}`,
    content:
      m.transcript?.slice(0, RERANK_CONTENT_MAX_LENGTH) ||
      m.description?.slice(0, RERANK_CONTENT_MAX_LENGTH) ||
      m.media_summary?.slice(0, RERANK_CONTENT_MAX_LENGTH) ||
      "",
    title: m.title,
    score: MEDIA_DEFAULT_SCORE,
    rank: docCandidates.length + idx + 1,
  }));

  const allCandidates = [...docCandidates, ...mediaCandidates];
  const rerankResult = await rerankerService.rerank(
    params.query,
    allCandidates,
    params.limit + params.offset
  );

  const docMap = new Map(
    orchestratorResult.documents.map((d) => [d.document.id, d])
  );
  const mediaMap = new Map(mediaResult.media.map((m) => [m.id, m]));

  const rankedRefs: ScoredRef[] = rerankResult
    ? rerankResult.results.map((r) => parseRerankId(r.id, r.score))
    : allCandidates.map((c) => parseRerankId(c.id, c.score ?? 0));

  const paginatedRefs = rankedRefs.slice(
    params.offset,
    params.offset + params.limit
  );

  const items: Array<
    | {
        type: "document";
        data: (typeof orchestratorResult.documents)[0]["document"] & {
          relevance: number;
        };
        relevance: number;
      }
    | {
        type: "media";
        data: (typeof mediaResult.media)[0] & { relevance: number };
        relevance: number;
      }
  > = [];

  for (const ref of paginatedRefs) {
    if (ref.type === "document") {
      const d = docMap.get(ref.id);
      if (d) {
        items.push({
          type: "document",
          data: { ...d.document, relevance: ref.score },
          relevance: ref.score,
        });
      }
    } else {
      const m = mediaMap.get(ref.id);
      if (m) {
        items.push({
          type: "media",
          data: { ...m, relevance: ref.score },
          relevance: ref.score,
        });
      }
    }
  }

  const documents = items
    .filter(
      (i): i is (typeof items)[number] & { type: "document" } =>
        i.type === "document"
    )
    .map((i) => i.data);
  const media = items
    .filter(
      (i): i is (typeof items)[number] & { type: "media" } => i.type === "media"
    )
    .map((i) => i.data);

  return {
    items,
    documents,
    media,
    documentTotal: orchestratorResult.total,
    mediaTotal: mediaResult.total,
    total: orchestratorResult.total + mediaResult.total,
    queryTime: Math.max(
      orchestratorResult.timing.totalMs,
      mediaResult.queryTime
    ),
    embeddingTime: orchestratorResult.timing.embeddingMs,
  };
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
    .enum([
      "bm25",
      "semantic",
      "hybrid",
      "hybrid_v2_rerank",
      "recency",
      "engagement",
    ])
    .default("hybrid"),
  mediaRanking: z.enum(["bm25", "semantic", "hybrid"]).default("hybrid"),
});

const authorsInputSchema = z.object({
  limit: z.number().min(1).max(100).default(50),
});

const hybridSearchInputSchema = z.object({
  q: z.string().min(1),
  mode: z
    .enum(["bm25", "semantic", "hybrid", "hybrid_v2", "enterprise_v2"])
    .default("hybrid_v2"),
  rrfK: z.number().min(1).max(100).default(60),
  weightBm25: z.number().min(0).max(1).default(0.4),
  weightDense: z.number().min(0).max(1).default(0.4),
  weightSparse: z.number().min(0).max(1).default(0.2),
  connectorTypes: z.array(z.string()).optional(),
  documentTypes: z.array(z.string()).optional(),
  sourceIds: z.array(z.string()).optional(),
  authorIds: z.array(z.string()).optional(),
  fromDate: z.number().optional(),
  toDate: z.number().optional(),
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
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

      const useReranking = input.ranking === "hybrid_v2_rerank";

      const result = useReranking
        ? await unifiedSearchWithRerank({
            query: input.q,
            teamId: ctx.teamId,
            limit: input.limit,
            offset: effectiveOffset,
            includeMedia: input.includeMedia ?? true,
            mediaRanking: input.mediaRanking as MediaSearchRanking,
            accessControlIds,
            filters: {
              connectorTypes: input.connectorTypes,
              documentTypes: input.documentTypes,
              authorIds: input.authorIds,
              connectorId: input.connectorId,
              sourceId: input.sourceId,
              fromDate: input.fromDate,
              toDate: input.toDate,
            },
          })
        : await searchService.searchUnified({
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
          (item): item is (typeof result.items)[number] & { type: "media" } =>
            item.type === "media"
        )
        .map((item) => item.data);
      const allMedia = [...result.media, ...mediaFromItems];

      const storageKeys = collectStorageKeys(allMedia);
      const signedUrls = await generateSignedUrlsForKeys(storageKeys);

      const mediaWithThumbs = applyThumbnailUrls(result.media, signedUrls);
      const enrichedItems = applyThumbnailUrlsToItems(result.items, signedUrls);

      const currentCount = enrichedItems.length;
      const hasMore = effectiveOffset + currentCount < result.total;
      const nextCursor = hasMore ? effectiveOffset + input.limit : undefined;

      return {
        items: enrichedItems,
        documents: result.documents,
        media: mediaWithThumbs,
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

  hybrid: withActiveTeam
    .input(hybridSearchInputSchema)
    .query(async ({ ctx, input }) => {
      const accessControlIds = buildAccessControlIds(ctx);

      const result = await hybridSearchOrchestrator.search({
        query: input.q,
        teamId: ctx.teamId,
        limit: input.limit,
        offset: input.offset,
        mode: input.mode as SearchMode,
        rrfConfig: {
          k: input.rrfK,
          weights: {
            bm25: input.weightBm25,
            dense: input.weightDense,
            sparse: input.weightSparse,
          },
        },
        filters: {
          connectorTypes: input.connectorTypes,
          documentTypes: input.documentTypes,
          sourceIds: input.sourceIds,
          authorIds: input.authorIds,
          fromDate: input.fromDate,
          toDate: input.toDate,
        },
        accessControlIds,
      });

      return result;
    }),
});
