/**
 * Document Types for openplane_document schema
 *
 * The core document type that handles all connector content:
 * Slack messages, Drive files, Notion pages, GitHub issues, etc.
 */

import type { AccessControlFields, BaseDocument, Embedding } from "./common";

// === Document Type Enums ===

export type DocumentType =
  | "message"
  | "file"
  | "page"
  | "issue"
  | "ticket"
  | "email"
  | "note"
  | "pr"
  | "review"
  | "comment"
  | "wiki"
  | "task"
  | "meeting"
  | "recording"
  | "transcript"
  | "spreadsheet"
  | "presentation";

export type ConnectorType =
  | "slack"
  | "google_drive"
  | "notion"
  | "github"
  | "jira"
  | "confluence"
  | "linear"
  | "asana"
  | "dropbox"
  | "microsoft_teams"
  | "sharepoint"
  | "zendesk"
  | "intercom"
  | "hubspot"
  | "salesforce";

export type SourceType =
  | "channel"
  | "folder"
  | "database"
  | "repository"
  | "board"
  | "space"
  | "project"
  | "team";

export type DocumentStatus =
  | "open"
  | "in_progress"
  | "done"
  | "closed"
  | "archived";

export type DocumentPriority = "critical" | "high" | "medium" | "low" | "none";

export type DocumentSentiment = "positive" | "negative" | "neutral" | "mixed";

// === Main Document Interface ===

export interface OpenPlaneDocument extends BaseDocument, AccessControlFields {
  // === Connector Context ===
  connector_type: ConnectorType | string;
  workspace_id?: string;
  external_id: string;

  // === Document Identity ===
  document_type: DocumentType | string;
  document_subtype?: string;
  mime_type?: string;

  // === Content ===
  title: string;
  content: string;
  content_plain?: string;
  content_html?: string;

  // === Embeddings ===
  content_embedding?: Embedding;
  title_embedding?: Embedding;

  // === AI-Generated ===
  ai_summary?: string;
  ai_topics?: string[];
  ai_entities?: string[];
  ai_sentiment?: DocumentSentiment;
  ai_language?: string;

  // === Hierarchy ===
  parent_id?: string;
  thread_id?: string;
  project_id?: string;
  project_ids?: string[];
  related_doc_ids?: string[];
  referenced_doc_ids?: string[];

  // === Source/Container ===
  source_id?: string;
  source_name?: string;
  source_type?: SourceType | string;
  source_path?: string;

  // === Authorship ===
  author_id?: string;
  author_external_id?: string;
  author_name?: string;
  author_email?: string;

  // === Contributors ===
  contributor_ids?: string[];
  mentioned_user_ids?: string[];
  assignee_ids?: string[];
  reviewer_ids?: string[];

  // === Timestamps ===
  indexed_at?: number;
  last_accessed_at?: number;
  due_date?: number;
  resolved_at?: number;

  // === Status & Workflow ===
  status?: DocumentStatus | string;
  priority?: DocumentPriority | string;
  state?: string;
  labels?: string[];
  sprint?: string;
  milestone?: string;
  version?: string;

  // === Engagement ===
  view_count?: number;
  unique_view_count?: number;
  click_count?: number;
  reaction_count?: number;
  comment_count?: number;
  reply_count?: number;
  share_count?: number;
  bookmark_count?: number;
  edit_count?: number;

  // === Rich Content ===
  attachments?: string[];
  attachment_count?: number;
  has_attachments?: boolean;
  has_images?: boolean;
  has_code?: boolean;
  has_links?: boolean;
  link_count?: number;
  word_count?: number;
  char_count?: number;
  reactions?: string; // JSON

  // === Quality Signals ===
  is_verified?: boolean;
  is_pinned?: boolean;
  is_featured?: boolean;
  quality_score?: number;
  freshness_score?: number;
  popularity_score?: number;
  trending_score?: number;

  // === URLs ===
  url?: string;
  permalink?: string;
  thumbnail_url?: string;
  preview?: string;

  // === File-Specific ===
  file_name?: string;
  file_extension?: string;
  file_size?: number;

  // === Metadata ===
  metadata?: string | Record<string, unknown>;
  custom_fields?: string;

  // === Sync ===
  checksum?: string;
  sync_version?: number;
}

// === Input Types (for indexing) ===

export interface DocumentInput {
  id: string;
  team_id: string;
  connector_id: string;
  connector_type: ConnectorType | string;
  external_id: string;
  document_type: DocumentType | string;
  title: string;
  content: string;
  is_public: boolean;

  // All optional fields
  workspace_id?: string;
  document_subtype?: string;
  mime_type?: string;
  content_plain?: string;
  content_html?: string;
  content_embedding?: Embedding;
  title_embedding?: Embedding;
  ai_summary?: string;
  ai_topics?: string[];
  ai_entities?: string[];
  ai_sentiment?: DocumentSentiment;
  ai_language?: string;
  parent_id?: string;
  thread_id?: string;
  project_id?: string;
  project_ids?: string[];
  source_id?: string;
  source_name?: string;
  source_type?: SourceType | string;
  source_path?: string;
  author_id?: string;
  author_external_id?: string;
  author_name?: string;
  author_email?: string;
  contributor_ids?: string[];
  mentioned_user_ids?: string[];
  assignee_ids?: string[];
  status?: DocumentStatus | string;
  priority?: DocumentPriority | string;
  labels?: string[];
  access_control?: string[];
  access_groups?: string[];
  url?: string;
  file_name?: string;
  file_extension?: string;
  file_size?: number;
  metadata?: Record<string, unknown>;
  created_at?: number;
  updated_at?: number;
}

// === Update Types ===

export interface DocumentUpdate {
  title?: string;
  content?: string;
  content_plain?: string;
  content_embedding?: Embedding;
  ai_summary?: string;
  ai_topics?: string[];
  ai_entities?: string[];
  status?: DocumentStatus | string;
  priority?: DocumentPriority | string;
  labels?: string[];
  view_count?: number;
  click_count?: number;
  popularity_score?: number;
  trending_score?: number;
  quality_score?: number;
  access_control?: string[];
  is_archived?: boolean;
  is_deleted?: boolean;
  last_accessed_at?: number;
  updated_at?: number;
}

// === Search Result ===

export interface DocumentSearchHit {
  id: string;
  relevance: number;
  document: OpenPlaneDocument;
}
