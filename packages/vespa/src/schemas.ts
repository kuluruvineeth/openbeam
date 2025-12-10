export type JsonPrimitive = string | number | boolean | null;
export type JsonArray = JsonValue[];
export type JsonObject = { [key: string]: JsonValue };
export type JsonValue = JsonPrimitive | JsonArray | JsonObject;

export type VideoType =
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

export interface VideoDocument {
  id: string;
  team_id: string;
  connector_id: string;
  connector_type?: string;
  external_id: string;
  title: string;
  description?: string;
  video_summary: string;
  video_keywords: string[];
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
  canonical_video_id?: string;
  video_type?: VideoType;
  language?: string;
}

export interface VideoVectorTensor {
  type: string;
  values: number[];
}

export type VideoRankingProfile =
  | "bm25"
  | "semantic"
  | "hybrid"
  | "enterprise"
  | "engagement"
  | "unified_text"
  | "topic_search"
  | "screen_content"
  | "meeting_search";

export interface VideoQueryParams {
  yql: string;
  ranking?: VideoRankingProfile;
  hits?: number;
  offset?: number;
  timeout?: string;
  video_embedding?: VideoVectorTensor;
  query_embedding?: VectorTensor;
  topic_embedding?: VideoVectorTensor;
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
  | "topic_search"
  | "authority"
  | "personalized";

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
}

export interface VespaVideoQueryBody {
  yql: string;
  hits: number;
  offset: number;
  "ranking.profile"?: VideoRankingProfile;
  timeout?: string;
  "input.query(video_embedding)"?: VideoVectorTensor;
  "input.query(query_embedding)"?: VectorTensor;
  "input.query(topic_embedding)"?: VideoVectorTensor;
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

export interface VespaVideoDocumentForFeed {
  id: string;
  team_id: string;
  connector_id: string;
  connector_type?: string;
  external_id: string;
  title: string;
  description: string;
  video_summary: string;
  video_keywords: string[];
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
  canonical_video_id?: string;
  video_type?: VideoType;
  language?: string;
}

export interface VespaUpdateField<T> {
  assign: T;
}

export type VespaVideoUpdatePayload = {
  [K in keyof VideoDocument]?: VespaUpdateField<VideoDocument[K]>;
};
