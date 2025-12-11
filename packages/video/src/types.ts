export interface VideoSegment {
  segmentId: string;
  startTime: number;
  endTime: number;
  embedding: number[];
  transcript?: string;
  description?: string;
  speaker?: string;
  ocrText?: string;
}

export interface VideoMetadata {
  summary: string;
  keywords: string[];
  duration: number;
  thumbnailUrl?: string;
  transcript?: string;
  chapters?: VideoChapter[];
  highlights?: VideoHighlight[];
  actionItems?: string[];
  detectedTopics?: string[];
  detectedLogos?: string[];
  participants?: string[];
  language?: string;
  videoType?: VideoType;
}

export type VideoType =
  | "meeting"
  | "presentation"
  | "tutorial"
  | "demo"
  | "interview"
  | "webinar"
  | "other";

export interface VideoChapter {
  title: string;
  start: number;
  end: number;
}

export interface VideoHighlight {
  description: string;
  start: number;
  end: number;
}

export interface ProcessedVideo {
  videoId: string;
  metadata: VideoMetadata;
  segments: VideoSegment[];
  thumbnailUrl?: string;
  transcriptEmbedding?: number[];
  topicEmbedding?: number[];
}

export interface VideoDocumentMetadata {
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
}

export interface VideoDocument {
  id: string;
  team_id: string;
  connector_id: string;
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
  metadata?: VideoDocumentMetadata;
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
  canonical_video_id?: string;
  video_type?: VideoType;
  language?: string;
}

export interface TwelveLabsConfig {
  apiKey: string;
  baseUrl: string;
}

export interface VideoSearchResult {
  videos: VideoDocument[];
  total: number;
  queryTime: number;
}

export type VideoSearchMode =
  | "visual"
  | "text"
  | "topic"
  | "screen"
  | "meeting";

export interface VideoSearchParams {
  query: string;
  teamId: string;
  limit?: number;
  offset?: number;
  accessControlIds?: string[];
  connectorId?: string;
  sourceId?: string;
  fromDate?: number;
  toDate?: number;
  videoType?: VideoType;
  searchMode?: VideoSearchMode;
  participants?: string[];
}

export interface UnifiedSearchParams extends VideoSearchParams {
  includeVideos?: boolean;
  includeDocuments?: boolean;
}

export interface SearchDocument {
  id: string;
  title: string;
  content: string;
  url?: string;
  score?: number;
}

export interface UnifiedSearchResult {
  documents: SearchDocument[];
  videos: VideoDocument[];
  total: number;
  queryTime: number;
}

export interface VideoProcessingJobData {
  type: "process" | "index";
  videoId: string;
  videoUrl: string;
  teamId: string;
  connectorId: string;
  externalId: string;
  title?: string;
  description?: string;
  sourceId?: string;
  sourceName?: string;
  sourceType?: string;
  authorId?: string;
  authorName?: string;
  accessControl?: string[];
  metadata?: VideoDocumentMetadata;
  traceContext?: {
    traceId?: string;
    spanId?: string;
  };
}
