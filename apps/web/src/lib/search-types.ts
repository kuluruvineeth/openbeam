import type { InfiniteData } from "@tanstack/react-query";
import type { DateRangeType, SearchRanking } from "@/lib/search-config";

export type SearchResultDocument = {
  id: string;
  connector_id: string;
  connector_type: string;
  team_id: string;
  workspace_id: string;
  external_id: string;
  document_type: string;
  document_subtype?: string;
  title: string;
  content: string;
  content_html?: string;
  author_id?: string;
  author_external_id?: string;
  author_name?: string;
  author_email?: string;
  author_avatar_url?: string;
  created_at: number;
  updated_at: number;
  indexed_at?: number;
  source_id?: string;
  source_name?: string;
  source_type?: string;
  source_path?: string;
  parent_id?: string;
  thread_id?: string;
  project_id?: string;
  status?: string;
  priority?: string;
  state?: string;
  labels?: string[];
  view_count?: number;
  reaction_count?: number;
  reply_count?: number;
  file_name?: string;
  file_extension?: string;
  file_size?: number;
  mime_type?: string;
  attachments?: string[];
  metadata?: Record<string, unknown>;
  access_control?: string[];
  is_public: boolean;
  url?: string;
  chunk_index?: number;
  total_chunks?: number;
  is_chunk?: boolean;
  page_number?: number;
  page_end?: number;
};

export type SearchFilters = {
  connectorTypes: string[];
  documentTypes: string[];
  sourceTypes: string[];
  statuses: string[];
  priorities: string[];
  labels: string[];
  authors: string[];
  dateRange: DateRangeType | null;
  fromDate: number | null;
  toDate: number | null;
  ranking: SearchRanking;
};

export type SearchResults = {
  documents: SearchResultDocument[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
  queryTime: number;
  query: string;
  ranking: string;
};

export type SearchPage = SearchResults & { nextCursor?: number };

export type SearchInfiniteData = InfiniteData<SearchPage>;

export type MediaType =
  | "meeting"
  | "presentation"
  | "tutorial"
  | "demo"
  | "interview"
  | "webinar"
  | "other";

export type MediaDocumentMetadata = {
  originalUrl?: string;
  fileSize?: number;
  format?: string;
  resolution?: string;
  frameRate?: number;
  bitrate?: number;
  codec?: string;
  uploadedBy?: string;
  uploadedAt?: number;
  tags?: string[];
  customFields?: Record<string, string | number | boolean>;
};

export type MediaDocument = {
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
  segment_embeddings?: Record<string, number[]>;
  segment_timestamps?: Record<string, [number, number]>;
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
  metadata?: MediaDocumentMetadata;
  view_count?: number;
  unique_viewers?: number;
  avg_watch_percentage?: number;
  share_count?: number;
  comment_count?: number;
  trending_score?: number;
  chapters?: string[];
  highlights?: string[];
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
};

export type ContentType = "all" | "documents" | "media";

export type UnifiedSearchItem =
  | { type: "document"; data: SearchResultDocument; relevance: number }
  | { type: "media"; data: MediaDocument; relevance: number };

export type UnifiedSearchResults = {
  items: UnifiedSearchItem[];
  documents: SearchResultDocument[];
  media: MediaDocument[];
  documentTotal: number;
  mediaTotal: number;
  total: number;
  queryTime: number;
  query: string;
};

export type { DateRangeType, SearchRanking } from "@/lib/search-config";

export type SearchTiming = {
  embeddingMs: number;
  retrievalMs: number;
  fusionMs: number;
  totalMs: number;
};

export type RRFConfig = {
  k: number;
  weightBm25: number;
  weightDense: number;
  weightSparse: number;
};
