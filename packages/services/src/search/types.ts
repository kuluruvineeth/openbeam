import type {
  GenericDocument,
  MediaDocument,
  MediaType,
} from "@openplane/vespa";

export type SearchRanking =
  | "bm25"
  | "semantic"
  | "hybrid"
  | "recency"
  | "engagement";

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
