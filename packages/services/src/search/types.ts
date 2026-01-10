import type {
  GenericDocument,
  MediaDocument,
  MediaType,
} from "@openplane/vespa";

export type {
  AuthorFacet,
  AuthorFacetsParams,
  AuthorSearchParams,
  ConnectorFacet,
  ConnectorFacetsParams,
  DocumentSearchResult as BaseDocumentSearchResult,
  HybridSearchRequest,
  MediaSearchParams as BaseMediaSearchParams,
  MediaSearchRanking,
  MediaSearchResult as BaseMediaSearchResult,
  RecentDocumentsParams,
  RetrievalResult,
  RRFConfig,
  SearchFilters,
  SearchMetadata,
  SearchMode,
  SearchParams,
  SearchRanking,
  SearchTiming,
  SimilarDocumentsParams,
  ThreadSearchParams,
  UnifiedSearchParams as BaseUnifiedSearchParams,
} from "@openplane/types/search";

export { RRFConfigSchema, SearchModeSchema } from "@openplane/types/search";

import type {
  MediaSearchRanking,
  SearchRanking,
} from "@openplane/types/search";

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
  timing: import("@openplane/types/search").SearchTiming;
  metadata: import("@openplane/types/search").SearchMetadata;
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
  connectorFacets: import("@openplane/types/search").ConnectorFacet[];
}
