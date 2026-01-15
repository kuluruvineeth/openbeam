import { z } from "zod";

export const MediaInputTypeSchema = z.enum(["video", "audio"]);
export type MediaInputType = z.infer<typeof MediaInputTypeSchema>;

export const MediaSegmentSchema = z.object({
  segmentId: z.string(),
  startTime: z.number(),
  endTime: z.number(),
  embedding: z.array(z.number()),
  transcript: z.string().optional(),
  description: z.string().optional(),
  speaker: z.string().optional(),
  ocrText: z.string().optional(),
});

export type MediaSegment = z.infer<typeof MediaSegmentSchema>;

export const MediaChapterSchema = z.object({
  title: z.string(),
  start: z.number(),
  end: z.number(),
});

export type MediaChapter = z.infer<typeof MediaChapterSchema>;

export const MediaHighlightSchema = z.object({
  description: z.string(),
  start: z.number(),
  end: z.number(),
});

export type MediaHighlight = z.infer<typeof MediaHighlightSchema>;

export const MediaMetadataSchema = z.object({
  summary: z.string(),
  keywords: z.array(z.string()),
  duration: z.number(),
  thumbnailUrl: z.string().optional(),
  transcript: z.string().optional(),
  chapters: z.array(MediaChapterSchema).optional(),
  highlights: z.array(MediaHighlightSchema).optional(),
  actionItems: z.array(z.string()).optional(),
  detectedTopics: z.array(z.string()).optional(),
  detectedLogos: z.array(z.string()).optional(),
  participants: z.array(z.string()).optional(),
  language: z.string().optional(),
  mediaType: z
    .enum([
      "meeting",
      "presentation",
      "tutorial",
      "demo",
      "interview",
      "webinar",
      "other",
    ])
    .optional(),
});

export type MediaMetadata = z.infer<typeof MediaMetadataSchema>;

export const ProcessedMediaSchema = z.object({
  mediaId: z.string(),
  metadata: MediaMetadataSchema,
  segments: z.array(MediaSegmentSchema),
  thumbnailUrl: z.string().optional(),
  transcriptEmbedding: z.array(z.number()).optional(),
  topicEmbedding: z.array(z.number()).optional(),
});

export type ProcessedMedia = z.infer<typeof ProcessedMediaSchema>;

export const MediaDocumentMetadataSchema = z.object({
  originalUrl: z.string().optional(),
  fileSize: z.number().optional(),
  format: z.string().optional(),
  resolution: z.string().optional(),
  frameRate: z.number().optional(),
  bitrate: z.number().optional(),
  codec: z.string().optional(),
  uploadedBy: z.string().optional(),
  uploadedAt: z.number().optional(),
  tags: z.array(z.string()).optional(),
  customFields: z
    .record(z.string(), z.union([z.string(), z.number(), z.boolean()]))
    .optional(),
});

export type MediaDocumentMetadata = z.infer<typeof MediaDocumentMetadataSchema>;

export const TwelveLabsConfigSchema = z.object({
  apiKey: z.string(),
  baseUrl: z.string(),
});

export type TwelveLabsConfig = z.infer<typeof TwelveLabsConfigSchema>;

export const MediaProcessingJobDataSchema = z.object({
  type: z.enum(["process", "index"]),
  mediaId: z.string(),
  mediaUrl: z.string(),
  teamId: z.string(),
  connectorId: z.string(),
  externalId: z.string(),
  title: z.string().optional(),
  description: z.string().optional(),
  sourceId: z.string().optional(),
  sourceName: z.string().optional(),
  sourceType: z.string().optional(),
  authorId: z.string().optional(),
  authorName: z.string().optional(),
  accessControl: z.array(z.string()).optional(),
  metadata: MediaDocumentMetadataSchema.optional(),
  traceContext: z
    .object({
      traceId: z.string().optional(),
      spanId: z.string().optional(),
    })
    .optional(),
});

export type MediaProcessingJobData = z.infer<
  typeof MediaProcessingJobDataSchema
>;
