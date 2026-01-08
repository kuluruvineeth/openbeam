export type JsonPrimitive = string | number | boolean | null;
export type JsonArray = JsonValue[];
export type JsonObject = { [key: string]: JsonValue };
export type JsonValue = JsonPrimitive | JsonArray | JsonObject;

export type MediaType =
  | "meeting"
  | "presentation"
  | "tutorial"
  | "demo"
  | "interview"
  | "webinar"
  | "other";

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
  embedding?: number[];
  title_embedding_v2?: number[];
  sparse_embedding?: Record<string, number>;
  embedding_version?: number;
  author_id?: string;
  author_external_id?: string;
  author_name?: string;
  author_email?: string;
  author_avatar_url?: string;
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
  metadata?: JsonObject;
  custom_fields?: string;
  checksum?: string;
  sync_version?: number;
  access_control?: string[];
  is_public: boolean;
  url?: string;
  chunk_index?: number;
  total_chunks?: number;
  parent_doc_id?: string;
  is_chunk?: boolean;
  page_number?: number;
  page_end?: number;
  section_id?: string;
  section_title?: string;
  section_path?: string[];
  section_level?: number;
  document_outline_hash?: string;
  has_structure?: boolean;
  element_types?: string[];
  entity_ids?: string[];
  entity_types?: string[];
  topics?: string[];
  topic_embedding?: number[];
  authority_score?: number;
  source_tier?: string;
  is_canonical?: boolean;
  inbound_links_count?: number;
  quality_score?: number;
  recent_accessor_ids?: string[];
  department_affinity?: number[];
  access_frequency?: number;
  trending_score?: number;
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
  metadata?: JsonObject;
  created_at: number;
  updated_at: number;
  is_active: boolean;
}

export interface MediaDocument {
  id: string;
  team_id: string;
  connector_id: string;
  connector_type?: string;
  external_id: string;
  title: string;
  description?: string;
  media_summary: string;
  media_keywords: string[];
  transcript?: string;
  duration_seconds: number;
  segment_count: number;
  segment_embeddings: Record<string, number[]>;
  segment_timestamps: Record<string, [number, number]>;
  segment_transcripts?: string[];
  segment_descriptions?: string[];
  segment_speakers?: string[];
  segment_ocr_text?: string[];
  transcript_embedding?: number[];
  topic_embedding?: number[];
  source_id?: string;
  source_name?: string;
  source_type?: string;
  url: string;
  thumbnail_url?: string;
  author_id?: string;
  author_name?: string;
  author_avatar_url?: string;
  participants?: string[];
  created_at: number;
  updated_at: number;
  indexed_at?: number;
  access_control?: string[];
  is_public: boolean;
  metadata?: JsonObject;
  view_count?: number;
  unique_viewers?: number;
  avg_watch_percentage?: number;
  share_count?: number;
  comment_count?: number;
  trending_score?: number;
  chapters?: string[];
  highlights?: string[];
  transcript_segments?: string[];
  action_items?: string[];
  detected_topics?: string[];
  detected_logos?: string[];
  entity_ids?: string[];
  mentioned_entity_ids?: string[];
  related_document_ids?: string[];
  discussed_in_channels?: string[];
  content_hash?: string;
  canonical_media_id?: string;
  media_type?: MediaType;
  language?: string;
}

export interface MediaVectorTensor {
  type: string;
  values: number[];
}

export type MediaRankingProfile =
  | "bm25"
  | "semantic"
  | "hybrid"
  | "enterprise"
  | "engagement"
  | "unified_text"
  | "topic_search"
  | "screen_content"
  | "meeting_search";

export interface MediaQueryParams {
  yql: string;
  ranking?: MediaRankingProfile;
  hits?: number;
  offset?: number;
  timeout?: string;
  media_embedding?: MediaVectorTensor;
  query_embedding?: VectorTensor;
  topic_embedding?: MediaVectorTensor;
}

export interface VectorTensor {
  type: string;
  values: number[];
}

export type DocumentRankingProfile =
  | "bm25"
  | "semantic"
  | "hybrid"
  | "hybrid_advanced"
  | "recency"
  | "hybrid_recency"
  | "engagement"
  | "enterprise"
  | "enterprise_optimized"
  | "navigational"
  | "recent_activity"
  | "topic_search"
  | "authority"
  | "personalized"
  | "semantic_v2"
  | "hybrid_v2"
  | "enterprise_v2"
  | "sparse_v2"
  | "global_sorted"
  | "global_sorted_v2"
  | "hybrid_debug"
  | "authority_debug"
  | "personalized_debug"
  | "enterprise_v2_debug";

export interface QueryMetrics {
  latencyMs: number;
  coverage: {
    full: boolean;
    timeout: boolean;
    matchPhase: boolean;
  };
  resultCount: number;
}

export const VESPA_METRIC_NAMES = {
  QUERY_LATENCY_MS: "vespa.query.latency_ms",
  QUERY_DEGRADED: "vespa.query.degraded",
  QUERY_ERROR: "vespa.query.error",
  FEED_LATENCY_MS: "vespa.feed.latency_ms",
  FEED_ERROR: "vespa.feed.error",
  CACHE_HIT: "vespa.cache.hit",
  CACHE_MISS: "vespa.cache.miss",
} as const;

export type VespaMetricName =
  (typeof VESPA_METRIC_NAMES)[keyof typeof VESPA_METRIC_NAMES];

export interface DetailedHealthStatus {
  healthy: boolean;
  containerUp: boolean;
  contentUp: boolean;
  searchLatencyMs: number;
  documentCount?: number;
}

export interface SparseTensorCell {
  address: { token: string };
  value: number;
}

export interface SparseTensor {
  cells: SparseTensorCell[];
}

export interface QueryParams {
  yql: string;
  ranking?: DocumentRankingProfile;
  hits?: number;
  offset?: number;
  timeout?: string;
  query_embedding?: VectorTensor;
  title_embedding?: VectorTensor;
  topic_embedding?: VectorTensor;
  user_dept_embedding?: VectorTensor;
  embedding_v2?: VectorTensor;
  sparse_embedding?: SparseTensor;
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

export interface VespaQueryBody {
  yql: string;
  hits: number;
  offset: number;
  "ranking.profile"?: DocumentRankingProfile;
  timeout?: string;
  "input.query(query_embedding)"?: VectorTensor;
  "input.query(title_embedding)"?: VectorTensor;
  "input.query(topic_embedding)"?: VectorTensor;
  "input.query(user_dept_embedding)"?: VectorTensor;
  "input.query(embedding_v2)"?: VectorTensor;
  "input.query(sparse_embedding)"?: SparseTensor;
}

export interface VespaMediaQueryBody {
  yql: string;
  hits: number;
  offset: number;
  "ranking.profile"?: MediaRankingProfile;
  timeout?: string;
  "input.query(media_embedding)"?: MediaVectorTensor;
  "input.query(query_embedding)"?: VectorTensor;
  "input.query(topic_embedding)"?: MediaVectorTensor;
}

export interface VespaEmbeddingCell {
  address: { segment: string; x: string };
  value: number;
}

export interface VespaTimestampCell {
  address: { segment: string; t: string };
  value: number;
}

export interface VespaTensorField<T> {
  cells: T[];
}

export interface VespaGenericDocumentForFeed {
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
  embedding?: number[];
  title_embedding_v2?: number[];
  sparse_embedding?: Record<string, number>;
  embedding_version?: number;
  author_id?: string;
  author_external_id?: string;
  author_name?: string;
  author_email?: string;
  author_avatar_url?: string;
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
  metadata?: string;
  custom_fields?: string;
  checksum?: string;
  sync_version?: number;
  access_control?: string[];
  is_public: boolean;
  url?: string;
  chunk_index?: number;
  total_chunks?: number;
  parent_doc_id?: string;
  is_chunk?: boolean;
  page_number?: number;
  page_end?: number;
  section_id?: string;
  section_title?: string;
  section_path?: string[];
  section_level?: number;
  document_outline_hash?: string;
  has_structure?: boolean;
  element_types?: string[];
  entity_ids?: string[];
  entity_types?: string[];
  topics?: string[];
  topic_embedding?: number[];
  authority_score?: number;
  source_tier?: string;
  is_canonical?: boolean;
  inbound_links_count?: number;
  quality_score?: number;
  recent_accessor_ids?: string[];
  department_affinity?: number[];
  access_frequency?: number;
  trending_score?: number;
}

export interface VespaMediaDocumentForFeed {
  id: string;
  team_id: string;
  connector_id: string;
  connector_type?: string;
  external_id: string;
  title: string;
  description: string;
  media_summary: string;
  media_keywords: string[];
  transcript: string;
  duration_seconds: number;
  segment_count: number;
  segment_embeddings?: VespaTensorField<VespaEmbeddingCell>;
  segment_timestamps?: VespaTensorField<VespaTimestampCell>;
  segment_transcripts?: string[];
  segment_descriptions?: string[];
  segment_speakers?: string[];
  segment_ocr_text?: string[];
  transcript_embedding?: number[];
  topic_embedding?: number[];
  source_id: string;
  source_name: string;
  source_type: string;
  url: string;
  thumbnail_url: string;
  author_id: string;
  author_name: string;
  author_avatar_url?: string;
  participants?: string[];
  created_at: number;
  updated_at: number;
  indexed_at: number;
  access_control: string[];
  is_public: boolean;
  metadata: string;
  view_count: number;
  unique_viewers: number;
  avg_watch_percentage: number;
  share_count: number;
  comment_count: number;
  trending_score?: number;
  chapters: string[];
  highlights: string[];
  transcript_segments: string[];
  action_items?: string[];
  detected_topics?: string[];
  detected_logos?: string[];
  entity_ids?: string[];
  mentioned_entity_ids: string[];
  related_document_ids: string[];
  discussed_in_channels?: string[];
  content_hash: string;
  canonical_media_id?: string;
  media_type?: MediaType;
  language?: string;
}

export interface VespaUpdateField<T> {
  assign: T;
}

export type VespaMediaUpdatePayload = {
  [K in keyof MediaDocument]?: VespaUpdateField<MediaDocument[K]>;
};

export type SpreadsheetColumnType =
  | "string"
  | "number"
  | "date"
  | "boolean"
  | "unknown";

export interface SpreadsheetColumnInfo {
  name: string;
  type: SpreadsheetColumnType;
  nullable: boolean;
}

export interface SpreadsheetDocument {
  id: string;
  team_id: string;
  connector_id: string;
  connector_type: string;
  external_id: string;
  title: string;
  file_name: string;
  description?: string;
  storage_key: string;
  file_size: number;
  mime_type: string;
  sheets: string[];
  active_sheet: string;
  column_names: string[];
  column_types: string[];
  column_info: string;
  row_count: number;
  column_count: number;
  has_headers: boolean;
  content_summary: string;
  content_embedding?: number[];
  title_embedding?: number[];
  embedding_version?: number;
  author_id?: string;
  author_name?: string;
  author_email?: string;
  created_at: number;
  updated_at: number;
  indexed_at?: number;
  last_accessed_at?: number;
  source_id?: string;
  source_name?: string;
  source_type?: string;
  source_path?: string;
  parent_id?: string;
  project_id?: string;
  labels?: string[];
  access_control?: string[];
  is_public: boolean;
  url?: string;
  metadata?: JsonObject;
  checksum?: string;
  sync_version?: number;
  quality_score?: number;
  view_count?: number;
  is_queryable: boolean;
}

export interface VespaSpreadsheetDocumentForFeed {
  id: string;
  team_id: string;
  connector_id: string;
  connector_type: string;
  external_id: string;
  title: string;
  file_name: string;
  description?: string;
  storage_key: string;
  file_size: number;
  mime_type: string;
  sheets: string[];
  active_sheet: string;
  column_names: string[];
  column_types: string[];
  column_info: string;
  row_count: number;
  column_count: number;
  has_headers: boolean;
  content_summary: string;
  content_embedding?: number[];
  title_embedding?: number[];
  embedding_version?: number;
  author_id?: string;
  author_name?: string;
  author_email?: string;
  created_at: number;
  updated_at: number;
  indexed_at?: number;
  last_accessed_at?: number;
  source_id?: string;
  source_name?: string;
  source_type?: string;
  source_path?: string;
  parent_id?: string;
  project_id?: string;
  labels?: string[];
  access_control?: string[];
  is_public: boolean;
  url?: string;
  metadata?: string;
  checksum?: string;
  sync_version?: number;
  quality_score?: number;
  view_count?: number;
  is_queryable: boolean;
}

export type VespaSpreadsheetUpdatePayload = {
  [K in keyof SpreadsheetDocument]?: VespaUpdateField<SpreadsheetDocument[K]>;
};

export type SpreadsheetRankingProfile =
  | "bm25"
  | "semantic"
  | "hybrid"
  | "column_search";

export interface SpreadsheetQueryParams {
  yql: string;
  ranking?: SpreadsheetRankingProfile;
  hits?: number;
  offset?: number;
  timeout?: string;
  query_embedding?: VectorTensor;
}
