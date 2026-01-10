import type { SearchMode } from "./config";

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

export interface DocumentSearchResult {
  documents: unknown[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
  queryTime: number;
  embeddingTime?: number;
}

export interface MediaSearchResult {
  media: unknown[];
  total: number;
  queryTime: number;
  embeddingTime?: number;
}

export interface ConnectorFacet {
  connectorType: string;
  documentCount: number;
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

export interface ConnectorFacetsParams {
  query?: string;
  teamId: string;
  accessControlIds?: string[];
}
