/**
 * Common Vespa Types
 *
 * Shared types and interfaces used across all Vespa schemas.
 */

// === Base Fields ===

/**
 * Fields common to all Vespa documents
 */
export interface BaseDocument {
  id: string;
  team_id: string;
  connector_id: string;
  created_at: number; // Unix timestamp in milliseconds
  updated_at: number;
}

// === Access Control ===

export interface AccessControlFields {
  access_control?: string[];
  access_groups?: string[];
  is_public: boolean;
  visibility?: "public" | "internal" | "team" | "private" | "restricted";
  is_archived?: boolean;
  is_deleted?: boolean;
}

// === Embeddings ===

export type Embedding = number[];

export interface EmbeddingConfig {
  dimensions: number;
  model: string;
}

export const DEFAULT_EMBEDDING_DIMENSIONS = 768;

// === Vespa API Types ===

/**
 * Vespa query parameters
 */
export interface VespaQueryParams {
  yql: string;
  ranking?: string;
  hits?: number;
  offset?: number;
  timeout?: string;
  "ranking.features"?: Record<string, unknown>;
  "input.query(query_embedding)"?: string;
  presentation?: {
    bolding?: boolean;
    format?: "json" | "xml";
    summary?: string;
  };
}

/**
 * Vespa search result structure
 */
export interface VespaSearchResult<T> {
  root: {
    id: string;
    relevance: number;
    fields: {
      totalCount: number;
    };
    coverage: {
      documents: number;
      full: boolean;
      degraded: {
        "match-phase": boolean;
        timeout: boolean;
        "adaptive-timeout": boolean;
      };
    };
    children?: VespaHit<T>[];
  };
}

export interface VespaHit<T> {
  id: string;
  relevance: number;
  source: string;
  fields: T;
}

/**
 * Vespa document API response
 */
export interface VespaFeedResponse {
  pathId: string;
  id: string;
}

/**
 * Vespa error response
 */
export interface VespaError {
  message: string;
  code?: number;
  trace?: {
    traces: Array<{
      message: string;
    }>;
  };
}

// === Rank Profiles ===

/**
 * Available rank profiles for documents
 */
export type DocumentRankProfile =
  | "default"
  | "bm25"
  | "semantic"
  | "semantic_title"
  | "hybrid"
  | "hybrid_advanced"
  | "hybrid_recency"
  | "recency"
  | "engagement"
  | "popular"
  | "quality"
  | "by_author"
  | "topics"
  | "issues"
  | "files"
  | "personalized"
  | "enterprise";

/**
 * Available rank profiles for people search
 */
export type PersonRankProfile =
  | "default"
  | "skills"
  | "organizational"
  | "semantic"
  | "hybrid"
  | "active_contributors"
  | "recently_active";

/**
 * Available rank profiles for code search
 */
export type CodeRankProfile =
  | "default"
  | "ngram"
  | "symbols"
  | "documentation"
  | "semantic"
  | "hybrid"
  | "recent"
  | "quality"
  | "language_specific";

/**
 * Available rank profiles for entity search
 */
export type EntityRankProfile =
  | "default"
  | "by_name"
  | "by_description"
  | "semantic"
  | "hybrid"
  | "active"
  | "popular";

// === Pagination ===

export interface PaginationOptions {
  limit?: number;
  offset?: number;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  hasMore: boolean;
  offset: number;
  limit: number;
}

// === Filter Types ===

export interface DateRangeFilter {
  from?: number;
  to?: number;
}

export interface SortOptions {
  field: string;
  order: "asc" | "desc";
}
