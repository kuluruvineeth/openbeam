import { z } from "zod";

export const FanoutQuerySchema = z.object({
  query: z.string(),
  intent: z.enum(["original", "expanded", "related"]),
  weight: z.number(),
});

export type FanoutQuery = z.infer<typeof FanoutQuerySchema>;

export const ContextChunkSchema = z.object({
  text: z.string(),
  startOffset: z.number(),
  endOffset: z.number(),
  score: z.number(),
});

export type ContextChunk = z.infer<typeof ContextChunkSchema>;

export const ContextDocumentSchema = z.object({
  id: z.string(),
  title: z.string(),
  content: z.string(),
  url: z.string().optional(),
  connectorType: z.string().optional(),
  sourceType: z.enum(["document", "media"]).optional(),
  score: z.number(),
  chunks: z.array(ContextChunkSchema),
});

export type ContextDocument = z.infer<typeof ContextDocumentSchema>;

export const BuiltContextSchema = z.object({
  text: z.string(),
  documents: z.array(ContextDocumentSchema),
  tokenCount: z.number(),
  truncated: z.boolean(),
});

export type BuiltContext = z.infer<typeof BuiltContextSchema>;

export const CitationMatchSchema = z.object({
  index: z.number(),
  documentId: z.string(),
  startPosition: z.number(),
  endPosition: z.number(),
});

export type CitationMatch = z.infer<typeof CitationMatchSchema>;

export const OverviewConfigSchema = z.object({
  maxSources: z.number(),
  maxTokens: z.number(),
  enableFanout: z.boolean(),
  fanoutQueries: z.number(),
  diversityWeight: z.number(),
  minRelevanceScore: z.number(),
  enableSemanticCache: z.boolean(),
  semanticCacheThreshold: z.number(),
  enableSearchCache: z.boolean(),
  enableModelRouting: z.boolean(),
});

export type OverviewConfig = z.infer<typeof OverviewConfigSchema>;

export const DEFAULT_OVERVIEW_CONFIG: OverviewConfig = {
  maxSources: 8,
  maxTokens: 6000,
  enableFanout: true,
  fanoutQueries: 3,
  diversityWeight: 0.3,
  minRelevanceScore: 0.3,
  enableSemanticCache: true,
  semanticCacheThreshold: 0.75,
  enableSearchCache: true,
  enableModelRouting: true,
};
