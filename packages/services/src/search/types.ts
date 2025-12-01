import type { GenericDocument } from "@openplane/vespa";

export type SearchRanking =
  | "bm25"
  | "semantic"
  | "hybrid"
  | "recency"
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
