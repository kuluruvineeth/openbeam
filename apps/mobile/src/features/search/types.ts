import type { InfiniteData } from "@tanstack/react-query";

export type SearchRanking =
  | "bm25"
  | "semantic"
  | "hybrid"
  | "hybrid_v2"
  | "hybrid_v2_rerank"
  | "recency"
  | "engagement";

export type DateRangeType =
  | "today"
  | "yesterday"
  | "last_7_days"
  | "last_30_days"
  | "last_90_days"
  | "custom";

export type RRFConfig = {
  k: number;
  weightBm25: number;
  weightDense: number;
  weightSparse: number;
};

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
  view_count?: number;
  comment_count?: number;
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

export type ConnectorFacet = {
  connectorType: string;
  documentCount: number;
};

export type SearchTiming = {
  embeddingMs: number;
  retrievalMs: number;
  fusionMs: number;
  totalMs: number;
};
