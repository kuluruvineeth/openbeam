export interface GenericDocument {
  id: string;
  connector_id: string;
  connector_type: string;
  team_id: string;
  workspace_id: string;
  external_id: string;
  document_type: string;
  document_subtype?: string;
  mime_type?: string;
  title: string;
  content: string;
  content_plain?: string;
  content_html?: string;
  content_embedding?: number[];
  title_embedding?: number[];
  author_id?: string;
  author_external_id?: string;
  author_name?: string;
  author_email?: string;
  contributor_ids?: string[];
  mentioned_user_ids?: string[];
  assignee_ids?: string[];
  reviewer_ids?: string[];
  created_at: number;
  updated_at: number;
  indexed_at?: number;
  last_accessed_at?: number;
  due_date?: number;
  resolved_at?: number;
  source_id?: string;
  source_name?: string;
  source_type?: string;
  source_path?: string;

  parent_id?: string;
  thread_id?: string;
  project_id?: string;
  related_doc_ids?: string[];
  referenced_doc_ids?: string[];
  status?: string;
  priority?: string;
  state?: string;
  labels?: string[];
  sprint?: string;
  milestone?: string;
  version?: string;
  view_count?: number;
  reaction_count?: number;
  reply_count?: number;
  file_name?: string;
  file_extension?: string;
  file_size?: number;
  attachments?: string[];
  metadata?: Record<string, unknown>;
  custom_fields?: string;
  checksum?: string;
  sync_version?: number;
  access_control?: string[];
  is_public: boolean;
  url?: string;
}

export interface Entity {
  id: string;
  entity_type: string;
  connector_id: string;
  team_id: string;
  external_id: string;
  name: string;
  email?: string;
  avatar_url?: string;
  metadata?: Record<string, unknown>;
  created_at: number;
  updated_at: number;
  is_active: boolean;
}

export interface QueryParams {
  yql: string;
  ranking?: "bm25" | "semantic" | "hybrid" | "recency" | "engagement";
  hits?: number;
  offset?: number;
  timeout?: string;
}

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

export interface FeedResponse {
  pathId: string;
  id: string;
}

export interface VespaError {
  message: string;
  code?: number;
  trace?: {
    traces: Array<{
      message: string;
    }>;
  };
}
