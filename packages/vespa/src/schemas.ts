/**
 * TypeScript types matching Vespa schemas
 * These provide type safety when indexing and querying documents
 */

/**
 * Generic document interface
 * Works for ANY connector: Slack, Notion, Drive, GitHub, etc.
 */
export interface GenericDocument {
  id: string;

  // Metadata
  connector_id: string;
  connector_type: string;
  organization_id: string;
  workspace_id: string;

  // Document identifiers
  external_id: string;
  document_type: string;

  // Content
  title: string;
  content: string;
  content_embedding?: number[];

  // Authorship & timestamps
  author_id?: string;
  author_name?: string;
  created_at: number; // Unix timestamp in milliseconds
  updated_at: number;

  // Source/container info
  source_id?: string;
  source_name?: string;
  source_type?: string;

  // Thread/parent relationships
  parent_id?: string;
  thread_id?: string;

  // Engagement metrics
  view_count?: number;
  reaction_count?: number;
  reply_count?: number;

  // Rich content
  attachments?: string[];
  metadata?: Record<string, unknown>;

  // Access control
  access_control?: string[];
  is_public: boolean;

  // URL
  url?: string;
}

/**
 * Entity interface for users, channels, workspaces, groups
 */
export interface Entity {
  id: string;
  entity_type: string;
  connector_id: string;
  organization_id: string;
  external_id: string;
  name: string;
  email?: string;
  avatar_url?: string;
  metadata?: Record<string, unknown>;
  created_at: number;
  updated_at: number;
  is_active: boolean;
}

/**
 * Vespa query parameters
 */
export interface QueryParams {
  yql: string;
  ranking?: "bm25" | "semantic" | "hybrid" | "recency" | "engagement";
  hits?: number;
  offset?: number;
  timeout?: string;
}

/**
 * Vespa search result
 */
export interface SearchResult<T = GenericDocument> {
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
    children?: Array<{
      id: string;
      relevance: number;
      source: string;
      fields: T;
    }>;
  };
}

/**
 * Vespa feed response
 */
export interface FeedResponse {
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
