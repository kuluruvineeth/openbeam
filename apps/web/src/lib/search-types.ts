import type { InfiniteData } from "@tanstack/react-query";
import type { DateRangeType, SearchRanking } from "./search-config";

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
  dateRange: DateRangeType | null;
  fromDate: number | null;
  toDate: number | null;
  ranking: SearchRanking;
  offset: number;
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

export type { DateRangeType, SearchRanking } from "./search-config";
