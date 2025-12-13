import type { MediaType } from "@openplane/vespa";

export type MediaInputType = "video" | "audio";

export interface MediaSegment {
  segmentId: string;
  startTime: number;
  endTime: number;
  embedding: number[];
  transcript?: string;
  description?: string;
  speaker?: string;
  ocrText?: string;
}

export interface MediaMetadata {
  summary: string;
  keywords: string[];
  duration: number;
  thumbnailUrl?: string;
  transcript?: string;
  chapters?: MediaChapter[];
  highlights?: MediaHighlight[];
  actionItems?: string[];
  detectedTopics?: string[];
  detectedLogos?: string[];
  participants?: string[];
  language?: string;
  mediaType?: MediaType;
}

export interface MediaChapter {
  title: string;
  start: number;
  end: number;
}

export interface MediaHighlight {
  description: string;
  start: number;
  end: number;
}

export interface ProcessedMedia {
  mediaId: string;
  metadata: MediaMetadata;
  segments: MediaSegment[];
  thumbnailUrl?: string;
  transcriptEmbedding?: number[];
  topicEmbedding?: number[];
}

export interface MediaDocumentMetadata {
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

export interface TwelveLabsConfig {
  apiKey: string;
  baseUrl: string;
}

export interface MediaProcessingJobData {
  type: "process" | "index";
  mediaId: string;
  mediaUrl: string;
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
  metadata?: MediaDocumentMetadata;
  traceContext?: {
    traceId?: string;
    spanId?: string;
  };
}
