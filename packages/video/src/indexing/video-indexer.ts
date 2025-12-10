import { VideoEmbeddingService } from "../processing/embedder";
import type {
  ProcessedVideo,
  VideoDocument,
  VideoDocumentMetadata,
  VideoType,
} from "../types";

interface VideoIndexerOptions {
  modelName?: "marengo3.0" | "marengo2.7";
}

interface VideoIndexParams {
  videoUrl: string;
  teamId: string;
  connectorId: string;
  externalId: string;
  title: string;
  description?: string;
  sourceId?: string;
  sourceName?: string;
  sourceType?: string;
  authorId?: string;
  authorName?: string;
  accessControl?: string[];
  isPublic?: boolean;
  metadata?: VideoDocumentMetadata;
  indexId?: string;
  entityIds?: string[];
  discussedInChannels?: string[];
  videoType?: VideoType;
}

interface VespaVideoDocument {
  id: string;
  team_id: string;
  connector_id: string;
  external_id: string;
  title: string;
  description: string;
  video_summary: string;
  video_keywords: string[];
  transcript: string;
  duration_seconds: number;
  segment_count: number;
  segment_transcripts: string[];
  segment_descriptions: string[];
  segment_speakers: string[];
  segment_ocr_text: string[];
  source_id: string;
  source_name: string;
  source_type: string;
  url: string;
  thumbnail_url: string;
  author_id: string;
  author_name: string;
  participants: string[];
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
  trending_score: number;
  chapters: string[];
  highlights: string[];
  action_items: string[];
  detected_topics: string[];
  detected_logos: string[];
  entity_ids: string[];
  mentioned_entity_ids: string[];
  related_document_ids: string[];
  discussed_in_channels: string[];
  content_hash: string;
  canonical_video_id: string;
  video_type: string;
  language: string;
  segment_embeddings?: { cells: TensorCell[] };
  segment_timestamps?: { cells: TimestampCell[] };
  transcript_embedding?: { values: number[] };
  topic_embedding?: { values: number[] };
}

interface TensorCell {
  address: { segment: string; x: string };
  value: number;
}

interface TimestampCell {
  address: { segment: string; t: string };
  value: number;
}

export class VideoIndexer {
  private readonly embeddingService: VideoEmbeddingService;

  constructor(options: VideoIndexerOptions = {}) {
    this.embeddingService = new VideoEmbeddingService(options);
  }

  async indexVideo(params: VideoIndexParams): Promise<VideoDocument> {
    const processed = await this.embeddingService.processVideo(
      params.videoUrl,
      params.indexId
    );

    const videoDoc = this.buildVideoDocument(params, processed);
    await this.feedVideoDocument(videoDoc);

    return videoDoc;
  }

  private buildVideoDocument(
    params: VideoIndexParams,
    processed: ProcessedVideo
  ): VideoDocument {
    const now = Date.now();

    const segmentEmbeddings: Record<string, number[]> = {};
    const segmentTimestamps: Record<string, [number, number]> = {};
    const segmentTranscripts: string[] = [];
    const segmentDescriptions: string[] = [];
    const segmentSpeakers: string[] = [];
    const segmentOcrText: string[] = [];

    for (const segment of processed.segments) {
      segmentEmbeddings[segment.segmentId] = segment.embedding;
      segmentTimestamps[segment.segmentId] = [
        segment.startTime,
        segment.endTime,
      ];
      if (segment.transcript) {
        segmentTranscripts.push(segment.transcript);
      }
      if (segment.description) {
        segmentDescriptions.push(segment.description);
      }
      if (segment.speaker) {
        segmentSpeakers.push(segment.speaker);
      }
      if (segment.ocrText) {
        segmentOcrText.push(segment.ocrText);
      }
    }

    return {
      id: `video_${params.connectorId}_${params.externalId}`,
      team_id: params.teamId,
      connector_id: params.connectorId,
      external_id: params.externalId,
      title: params.title,
      description: params.description,
      video_summary: processed.metadata.summary,
      video_keywords: processed.metadata.keywords,
      transcript: processed.metadata.transcript,
      duration_seconds: processed.metadata.duration,
      segment_count: processed.segments.length,
      segment_embeddings: segmentEmbeddings,
      segment_timestamps: segmentTimestamps,
      segment_transcripts:
        segmentTranscripts.length > 0 ? segmentTranscripts : undefined,
      segment_descriptions:
        segmentDescriptions.length > 0 ? segmentDescriptions : undefined,
      segment_speakers:
        segmentSpeakers.length > 0 ? segmentSpeakers : undefined,
      segment_ocr_text: segmentOcrText.length > 0 ? segmentOcrText : undefined,
      transcript_embedding: processed.transcriptEmbedding,
      topic_embedding: processed.topicEmbedding,
      source_id: params.sourceId,
      source_name: params.sourceName,
      source_type: params.sourceType,
      url: params.videoUrl,
      thumbnail_url: processed.thumbnailUrl,
      author_id: params.authorId,
      author_name: params.authorName,
      participants: processed.metadata.participants,
      created_at: now,
      updated_at: now,
      indexed_at: now,
      access_control: params.accessControl,
      is_public: params.isPublic ?? false,
      metadata: params.metadata,
      chapters: processed.metadata.chapters?.map((c) => JSON.stringify(c)),
      highlights: processed.metadata.highlights?.map((h) => JSON.stringify(h)),
      action_items: processed.metadata.actionItems,
      detected_topics: processed.metadata.detectedTopics,
      detected_logos: processed.metadata.detectedLogos,
      video_type: processed.metadata.videoType,
      language: processed.metadata.language,
    };
  }

  private async feedVideoDocument(doc: VideoDocument): Promise<void> {
    const vespaDoc = this.formatVideoForVespa(doc);
    const documentPath = `/document/v1/default/video_document/docid/${doc.id}`;
    const vespaUrl = process.env.VESPA_URL || "http://localhost:8080";

    const response = await fetch(`${vespaUrl}${documentPath}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fields: vespaDoc }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Vespa video feed error: ${error}`);
    }
  }

  private formatVideoForVespa(doc: VideoDocument): VespaVideoDocument {
    const vespaDoc = this.buildVespaBaseFields(doc);
    this.addTensorFields(doc, vespaDoc);
    return vespaDoc;
  }

  private buildVespaBaseFields(doc: VideoDocument): VespaVideoDocument {
    return {
      ...this.getIdentityFields(doc),
      ...this.getContentFields(doc),
      ...this.getSourceFields(doc),
      ...this.getMetaFields(doc),
      ...this.getEngagementFields(doc),
      ...this.getRelationFields(doc),
    };
  }

  private getIdentityFields(doc: VideoDocument) {
    return {
      id: doc.id,
      team_id: doc.team_id,
      connector_id: doc.connector_id,
      external_id: doc.external_id,
    };
  }

  private getContentFields(doc: VideoDocument) {
    return {
      title: doc.title,
      description: doc.description ?? "",
      video_summary: doc.video_summary,
      video_keywords: doc.video_keywords,
      transcript: doc.transcript ?? "",
      duration_seconds: doc.duration_seconds,
      segment_count: doc.segment_count,
      segment_transcripts: doc.segment_transcripts ?? [],
      segment_descriptions: doc.segment_descriptions ?? [],
      segment_speakers: doc.segment_speakers ?? [],
      segment_ocr_text: doc.segment_ocr_text ?? [],
    };
  }

  private getSourceFields(doc: VideoDocument) {
    return {
      source_id: doc.source_id ?? "",
      source_name: doc.source_name ?? "",
      source_type: doc.source_type ?? "",
      url: doc.url,
      thumbnail_url: doc.thumbnail_url ?? "",
      author_id: doc.author_id ?? "",
      author_name: doc.author_name ?? "",
      participants: doc.participants ?? [],
    };
  }

  private getMetaFields(doc: VideoDocument) {
    return {
      created_at: doc.created_at,
      updated_at: doc.updated_at,
      indexed_at: doc.indexed_at ?? Date.now(),
      access_control: doc.access_control ?? [],
      is_public: doc.is_public,
      metadata: doc.metadata ? JSON.stringify(doc.metadata) : "",
      video_type: doc.video_type ?? "",
      language: doc.language ?? "",
    };
  }

  private getEngagementFields(doc: VideoDocument) {
    return {
      view_count: doc.view_count ?? 0,
      unique_viewers: doc.unique_viewers ?? 0,
      avg_watch_percentage: doc.avg_watch_percentage ?? 0,
      share_count: doc.share_count ?? 0,
      comment_count: doc.comment_count ?? 0,
      trending_score: doc.trending_score ?? 0,
      chapters: doc.chapters ?? [],
      highlights: doc.highlights ?? [],
      action_items: doc.action_items ?? [],
      detected_topics: doc.detected_topics ?? [],
      detected_logos: doc.detected_logos ?? [],
    };
  }

  private getRelationFields(doc: VideoDocument) {
    return {
      entity_ids: doc.entity_ids ?? [],
      mentioned_entity_ids: doc.mentioned_entity_ids ?? [],
      related_document_ids: doc.related_document_ids ?? [],
      discussed_in_channels: doc.discussed_in_channels ?? [],
      content_hash: doc.content_hash ?? "",
      canonical_video_id: doc.canonical_video_id ?? "",
    };
  }

  private addTensorFields(
    doc: VideoDocument,
    vespaDoc: VespaVideoDocument
  ): void {
    const embeddingCells = this.buildEmbeddingCells(doc.segment_embeddings);
    const timestampCells = this.buildTimestampCells(doc.segment_timestamps);

    if (embeddingCells.length > 0) {
      vespaDoc.segment_embeddings = { cells: embeddingCells };
    }
    if (timestampCells.length > 0) {
      vespaDoc.segment_timestamps = { cells: timestampCells };
    }
    if (doc.transcript_embedding) {
      vespaDoc.transcript_embedding = { values: doc.transcript_embedding };
    }
    if (doc.topic_embedding) {
      vespaDoc.topic_embedding = { values: doc.topic_embedding };
    }
  }

  private buildEmbeddingCells(
    embeddings: Record<string, number[]>
  ): TensorCell[] {
    const cells: TensorCell[] = [];
    for (const [segId, embedding] of Object.entries(embeddings)) {
      for (let i = 0; i < embedding.length; i++) {
        const value = embedding[i];
        if (value !== undefined) {
          cells.push({ address: { segment: segId, x: String(i) }, value });
        }
      }
    }
    return cells;
  }

  private buildTimestampCells(
    timestamps: Record<string, [number, number]>
  ): TimestampCell[] {
    const cells: TimestampCell[] = [];
    for (const [segId, [start, end]] of Object.entries(timestamps)) {
      cells.push({ address: { segment: segId, t: "0" }, value: start });
      cells.push({ address: { segment: segId, t: "1" }, value: end });
    }
    return cells;
  }

  async deleteVideo(videoId: string): Promise<void> {
    const vespaUrl = process.env.VESPA_URL || "http://localhost:8080";
    const documentPath = `/document/v1/default/video_document/docid/${videoId}`;

    const response = await fetch(`${vespaUrl}${documentPath}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Vespa video delete error: ${error}`);
    }
  }

  async updateVideoEngagement(
    videoId: string,
    engagement: {
      viewCount?: number;
      uniqueViewers?: number;
      avgWatchPercentage?: number;
      shareCount?: number;
      commentCount?: number;
      trendingScore?: number;
    }
  ): Promise<void> {
    const vespaUrl = process.env.VESPA_URL || "http://localhost:8080";
    const documentPath = `/document/v1/default/video_document/docid/${videoId}`;

    const updates: Record<string, { assign: number }> = {};
    if (engagement.viewCount !== undefined) {
      updates.view_count = { assign: engagement.viewCount };
    }
    if (engagement.uniqueViewers !== undefined) {
      updates.unique_viewers = { assign: engagement.uniqueViewers };
    }
    if (engagement.avgWatchPercentage !== undefined) {
      updates.avg_watch_percentage = { assign: engagement.avgWatchPercentage };
    }
    if (engagement.shareCount !== undefined) {
      updates.share_count = { assign: engagement.shareCount };
    }
    if (engagement.commentCount !== undefined) {
      updates.comment_count = { assign: engagement.commentCount };
    }
    if (engagement.trendingScore !== undefined) {
      updates.trending_score = { assign: engagement.trendingScore };
    }

    const response = await fetch(`${vespaUrl}${documentPath}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fields: updates }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Vespa video update error: ${error}`);
    }
  }

  async updateVideoRelations(
    videoId: string,
    relations: {
      entityIds?: string[];
      mentionedEntityIds?: string[];
      relatedDocumentIds?: string[];
      discussedInChannels?: string[];
    }
  ): Promise<void> {
    const vespaUrl = process.env.VESPA_URL || "http://localhost:8080";
    const documentPath = `/document/v1/default/video_document/docid/${videoId}`;

    const updates: Record<string, { assign: string[] }> = {};
    if (relations.entityIds) {
      updates.entity_ids = { assign: relations.entityIds };
    }
    if (relations.mentionedEntityIds) {
      updates.mentioned_entity_ids = { assign: relations.mentionedEntityIds };
    }
    if (relations.relatedDocumentIds) {
      updates.related_document_ids = { assign: relations.relatedDocumentIds };
    }
    if (relations.discussedInChannels) {
      updates.discussed_in_channels = { assign: relations.discussedInChannels };
    }

    const response = await fetch(`${vespaUrl}${documentPath}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fields: updates }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Vespa video update error: ${error}`);
    }
  }
}

export const videoIndexer = new VideoIndexer();
