import type { GenericDocument } from "@openplane/vespa";
import type { VideoDocument } from "@openplane/video";

export type SearchRanking =
  | "bm25"
  | "semantic"
  | "hybrid"
  | "recency"
  | "engagement";

export type VideoSearchRanking =
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
  sourceId?: string;
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

export interface SearchResult {
  documents: GenericDocument[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
  queryTime: number;
  embeddingTime?: number;
}

export interface AutocompleteSuggestion {
  id: string;
  title: string;
  content?: string;
  documentType: string;
  connectorType: string;
  sourceName?: string;
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

export interface AutocompleteParams {
  prefix: string;
  teamId: string;
  limit?: number;
  accessControlIds?: string[];
}

export type VideoType =
  | "meeting"
  | "presentation"
  | "tutorial"
  | "demo"
  | "interview"
  | "webinar"
  | "other";

export interface VideoSearchParams {
  query: string;
  teamId: string;
  limit?: number;
  offset?: number;
  accessControlIds?: string[];
  connectorId?: string;
  sourceId?: string;
  fromDate?: number;
  toDate?: number;
  ranking?: VideoSearchRanking;
  videoType?: VideoType;
}

export interface VideoSearchResult {
  videos: VideoDocument[];
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
  sourceId?: string;
  fromDate?: number;
  toDate?: number;
  ranking?: SearchRanking;
  videoRanking?: VideoSearchRanking;
  includeDocuments?: boolean;
  includeVideos?: boolean;
}

export type ScoredDocument = GenericDocument & { relevance: number };
export type ScoredVideo = VideoDocument & { relevance: number };

export type UnifiedSearchItem =
  | { type: "document"; data: ScoredDocument; relevance: number }
  | { type: "video"; data: ScoredVideo; relevance: number };

export interface UnifiedSearchResult {
  items: UnifiedSearchItem[];
  documents: GenericDocument[];
  videos: VideoDocument[];
  documentTotal: number;
  videoTotal: number;
  total: number;
  queryTime: number;
  embeddingTime?: number;
}
