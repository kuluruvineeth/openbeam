import type {
  GenericDocument,
  MediaDocument,
  MediaType,
} from "@openplane/vespa";
import { z } from "zod";

export type SearchRanking =
  | "bm25"
  | "semantic"
  | "hybrid"
  | "recency"
  | "engagement";

export const SearchModeSchema = z.enum([
  "bm25",
  "semantic",
  "hybrid",
  "hybrid_v2",
  "hybrid_v2_rerank",
  "enterprise_v2",
  "enterprise_v2_ltr",
]);
export type SearchMode = z.infer<typeof SearchModeSchema>;

export const RRFConfigSchema = z.object({
  k: z.number().min(1).max(100).default(60),
  weights: z
    .object({
      bm25: z.number().min(0).max(1).default(0.4),
      dense: z.number().min(0).max(1).default(0.4),
      sparse: z.number().min(0).max(1).default(0.2),
    })
    .default({ bm25: 0.4, dense: 0.4, sparse: 0.2 }),
});
export type RRFConfig = z.infer<typeof RRFConfigSchema>;

export interface HybridSearchRequest {
  query: string;
  teamId: string;
  userId?: string;
  limit?: number;
  offset?: number;
  mode?: SearchMode;
  rrfConfig?: RRFConfig;
  filters?: SearchFilters;
  accessControlIds?: string[];
  experimentId?: string;
}

export interface SearchFilters {
  connectorTypes?: string[];
  documentTypes?: string[];
  sourceIds?: string[];
  authorIds?: string[];
  statuses?: string[];
  priorities?: string[];
  labels?: string[];
  fromDate?: number;
  toDate?: number;
}

export interface RankedDocument {
  document: GenericDocument;
  score: number;
  bm25Rank?: number;
  denseRank?: number;
  sparseRank?: number;
  rrfScore?: number;
  rerankScore?: number;
  rerankRank?: number;
  ltrScore?: number;
  ltrRank?: number;
  ltrFeatures?: Record<string, number>;
}

export interface HybridSearchResponse {
  documents: RankedDocument[];
  total: number;
  timing: SearchTiming;
  metadata: SearchMetadata;
}

export interface SearchTiming {
  embeddingMs: number;
  retrievalMs: number;
  fusionMs: number;
  rerankMs?: number;
  ltrMs?: number;
  personalizationMs?: number;
  totalMs: number;
}

export interface SearchMetadata {
  mode: SearchMode;
  experimentId?: string;
  modelVersion: string;
  rrfK?: number;
  rerankModel?: string;
  ltrModelVersion?: string;
  personalized?: boolean;
}

export interface RetrievalResult {
  docId: string;
  score: number;
  rank: number;
}

export type MediaSearchRanking =
  | "bm25"
  | "semantic"
  | "hybrid"
  | "enterprise"
  | "engagement";

export interface SearchParams {
  query: string;
  teamId: string;
  connectorTypes?: string[];
  connectorId?: string;
  documentTypes?: string[];
  authorId?: string;
  authorIds?: string[];
  sourceId?: string;
  sourceIds?: string[];
  sourceTypes?: string[];
  statuses?: string[];
  priorities?: string[];
  labels?: string[];
  fromDate?: number;
  toDate?: number;
  limit?: number;
  offset?: number;
  ranking?: SearchRanking;
  accessControlIds?: string[];
}

export interface DocumentSearchResult {
  documents: GenericDocument[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
  queryTime: number;
  embeddingTime?: number;
}

export interface RecentDocumentsParams {
  teamId: string;
  hours?: number;
  limit?: number;
  accessControlIds?: string[];
}

export interface ThreadSearchParams {
  threadId: string;
  teamId: string;
  accessControlIds?: string[];
}

export interface SimilarDocumentsParams {
  documentId: string;
  teamId: string;
  limit?: number;
  accessControlIds?: string[];
}

export interface AuthorSearchParams {
  authorId: string;
  teamId: string;
  limit?: number;
  accessControlIds?: string[];
}

export interface MediaSearchParams {
  query: string;
  teamId: string;
  limit?: number;
  offset?: number;
  accessControlIds?: string[];
  connectorId?: string;
  sourceId?: string;
  fromDate?: number;
  toDate?: number;
  ranking?: MediaSearchRanking;
  mediaType?: MediaType;
}

export interface MediaSearchResult {
  media: MediaDocument[];
  total: number;
  queryTime: number;
  embeddingTime?: number;
}

export interface UnifiedSearchParams {
  query: string;
  teamId: string;
  limit?: number;
  offset?: number;
  accessControlIds?: string[];
  connectorTypes?: string[];
  connectorId?: string;
  documentTypes?: string[];
  sourceTypes?: string[];
  statuses?: string[];
  priorities?: string[];
  labels?: string[];
  authorIds?: string[];
  sourceId?: string;
  fromDate?: number;
  toDate?: number;
  ranking?: SearchRanking;
  mediaRanking?: MediaSearchRanking;
  includeDocuments?: boolean;
  includeMedia?: boolean;
}

export type SearchScoredDocument = GenericDocument & { relevance: number };
export type ScoredMedia = MediaDocument & { relevance: number };

export type UnifiedSearchItem =
  | { type: "document"; data: SearchScoredDocument; relevance: number }
  | { type: "media"; data: ScoredMedia; relevance: number };

export interface UnifiedSearchResult {
  items: UnifiedSearchItem[];
  documents: GenericDocument[];
  media: MediaDocument[];
  documentTotal: number;
  mediaTotal: number;
  total: number;
  queryTime: number;
  embeddingTime?: number;
}

export interface AuthorFacet {
  authorId: string;
  authorName: string | null;
  authorEmail: string | null;
  authorAvatarUrl: string | null;
  documentCount: number;
}

export interface AuthorFacetsParams {
  teamId: string;
  accessControlIds?: string[];
  limit?: number;
}
