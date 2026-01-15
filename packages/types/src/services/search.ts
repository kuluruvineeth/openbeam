import { z } from "zod";

export const RankedDocumentSchema = z.object({
  document: z.unknown(),
  score: z.number(),
  bm25Rank: z.number().optional(),
  denseRank: z.number().optional(),
  sparseRank: z.number().optional(),
  rrfScore: z.number().optional(),
  rerankScore: z.number().optional(),
  rerankRank: z.number().optional(),
  ltrScore: z.number().optional(),
  ltrRank: z.number().optional(),
  ltrFeatures: z.record(z.string(), z.number()).optional(),
});

export type RankedDocument = z.infer<typeof RankedDocumentSchema>;

export const HybridSearchResponseSchema = z.object({
  documents: z.array(RankedDocumentSchema),
  total: z.number(),
  timing: z.object({
    queryMs: z.number(),
    totalMs: z.number(),
    embeddingMs: z.number().optional(),
    rerankMs: z.number().optional(),
  }),
  metadata: z.object({
    mode: z.string(),
    totalHits: z.number(),
  }),
});

export type HybridSearchResponse = z.infer<typeof HybridSearchResponseSchema>;

export const DocumentSearchResultSchema = z.object({
  documents: z.array(z.unknown()),
  total: z.number(),
  limit: z.number(),
  offset: z.number(),
  hasMore: z.boolean(),
  queryTime: z.number(),
  embeddingTime: z.number().optional(),
});

export type DocumentSearchResult = z.infer<typeof DocumentSearchResultSchema>;

export const MediaSearchParamsSchema = z.object({
  query: z.string(),
  teamId: z.string(),
  limit: z.number().optional(),
  offset: z.number().optional(),
  accessControlIds: z.array(z.string()).optional(),
  connectorId: z.string().optional(),
  sourceId: z.string().optional(),
  fromDate: z.number().optional(),
  toDate: z.number().optional(),
  ranking: z.string().optional(),
  mediaType: z.string().optional(),
});

export type MediaSearchParams = z.infer<typeof MediaSearchParamsSchema>;

export const MediaSearchResultSchema = z.object({
  media: z.array(z.unknown()),
  total: z.number(),
  queryTime: z.number(),
  embeddingTime: z.number().optional(),
});

export type MediaSearchResult = z.infer<typeof MediaSearchResultSchema>;

export const UnifiedSearchParamsSchema = z.object({
  query: z.string(),
  teamId: z.string(),
  limit: z.number().optional(),
  offset: z.number().optional(),
  accessControlIds: z.array(z.string()).optional(),
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
  ranking: z.string().optional(),
  mediaRanking: z.string().optional(),
  includeDocuments: z.boolean().optional(),
  includeMedia: z.boolean().optional(),
});

export type UnifiedSearchParams = z.infer<typeof UnifiedSearchParamsSchema>;

export const SearchScoredDocumentSchema = z.object({
  id: z.string(),
  relevance: z.number(),
});

export type SearchScoredDocument = z.infer<typeof SearchScoredDocumentSchema>;

export const ScoredMediaSchema = z.object({
  id: z.string(),
  relevance: z.number(),
});

export type ScoredMedia = z.infer<typeof ScoredMediaSchema>;

export const UnifiedSearchItemSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("document"),
    data: z.unknown(),
    relevance: z.number(),
  }),
  z.object({
    type: z.literal("media"),
    data: z.unknown(),
    relevance: z.number(),
  }),
]);

export type UnifiedSearchItem = z.infer<typeof UnifiedSearchItemSchema>;

export const UnifiedSearchResultSchema = z.object({
  items: z.array(UnifiedSearchItemSchema),
  documents: z.array(z.unknown()),
  media: z.array(z.unknown()),
  documentTotal: z.number(),
  mediaTotal: z.number(),
  total: z.number(),
  queryTime: z.number(),
  embeddingTime: z.number().optional(),
  connectorFacets: z.array(
    z.object({
      connectorType: z.string(),
      count: z.number(),
    })
  ),
});

export type UnifiedSearchResult = z.infer<typeof UnifiedSearchResultSchema>;
