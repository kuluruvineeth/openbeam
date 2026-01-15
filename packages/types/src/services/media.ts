import { z } from "zod";

export const ServiceMediaChapterSchema = z.object({
  title: z.string(),
  startTime: z.number(),
  endTime: z.number(),
  summary: z.string().optional(),
});

export type ServiceMediaChapter = z.infer<typeof ServiceMediaChapterSchema>;

export const ServiceMediaHighlightSchema = z.object({
  title: z.string(),
  startTime: z.number(),
  endTime: z.number(),
  transcript: z.string(),
  relevanceScore: z.number(),
});

export type ServiceMediaHighlight = z.infer<typeof ServiceMediaHighlightSchema>;

export const MediaGistSchema = z.object({
  summary: z.string(),
  topics: z.array(z.string()),
  sentiment: z.enum(["positive", "negative", "neutral", "mixed"]).optional(),
});

export type MediaGist = z.infer<typeof MediaGistSchema>;

export const MediaAnalysisResultSchema = z.object({
  gist: MediaGistSchema.optional(),
  chapters: z.array(ServiceMediaChapterSchema).optional(),
  highlights: z.array(ServiceMediaHighlightSchema).optional(),
  summary: z.string().optional(),
});

export type MediaAnalysisResult = z.infer<typeof MediaAnalysisResultSchema>;

export const MediaSummaryOptionsSchema = z.object({
  maxLength: z.number().optional(),
  style: z.enum(["brief", "detailed", "bullets"]).optional(),
});

export type MediaSummaryOptions = z.infer<typeof MediaSummaryOptionsSchema>;

export const MediaAnalysisOptionsSchema = z.object({
  includeChapters: z.boolean().optional(),
  includeHighlights: z.boolean().optional(),
  includeSummary: z.boolean().optional(),
  includeGist: z.boolean().optional(),
  maxChapters: z.number().optional(),
  maxHighlights: z.number().optional(),
});

export type MediaAnalysisOptions = z.infer<typeof MediaAnalysisOptionsSchema>;

export const TranscriptSegmentSchema = z.object({
  text: z.string(),
  start: z.number(),
  end: z.number(),
  speaker: z.string().optional(),
  confidence: z.number().optional(),
});

export type TranscriptSegment = z.infer<typeof TranscriptSegmentSchema>;

export const ImageSearchOptionsSchema = z.object({
  query: z.string(),
  limit: z.number().optional(),
  minScore: z.number().optional(),
});

export type ImageSearchOptions = z.infer<typeof ImageSearchOptionsSchema>;
