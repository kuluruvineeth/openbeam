import { z } from "zod";
import { ProviderIdSchema } from "./providers";

export const EmbeddingSchema = z.array(z.number());

export type Embedding = z.infer<typeof EmbeddingSchema>;

export const EmbeddingResultSchema = z.object({
  embedding: EmbeddingSchema,
  text: z.string(),
  tokenCount: z.number().int().nonnegative(),
});

export type EmbeddingResult = z.infer<typeof EmbeddingResultSchema>;

export const CachedEmbeddingResultSchema = EmbeddingResultSchema.extend({
  fromCache: z.boolean(),
});

export type CachedEmbeddingResult = z.infer<typeof CachedEmbeddingResultSchema>;

export const BatchEmbeddingResultSchema = z.object({
  embeddings: z.array(EmbeddingSchema),
  texts: z.array(z.string()),
  totalTokens: z.number().int().nonnegative(),
});

export type BatchEmbeddingResult = z.infer<typeof BatchEmbeddingResultSchema>;

export const CachedBatchEmbeddingResultSchema =
  BatchEmbeddingResultSchema.extend({
    cacheHits: z.number().int().nonnegative(),
  });

export type CachedBatchEmbeddingResult = z.infer<
  typeof CachedBatchEmbeddingResultSchema
>;

export const TextChunkSchema = z.object({
  id: z.string(),
  text: z.string(),
  index: z.number().int().nonnegative(),
  startOffset: z.number().int().nonnegative(),
  endOffset: z.number().int().nonnegative(),
  tokenCount: z.number().int().nonnegative(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type TextChunk = z.infer<typeof TextChunkSchema>;

export const ChunkingStrategySchema = z.enum([
  "fixed",
  "sentence",
  "paragraph",
  "recursive",
]);

export type ChunkingStrategy = z.infer<typeof ChunkingStrategySchema>;

export const ChunkingConfigSchema = z.object({
  strategy: ChunkingStrategySchema,
  maxChunkSize: z.number().int().positive(),
  minChunkSize: z.number().int().positive(),
  chunkOverlap: z.number().int().nonnegative(),
  separators: z.array(z.string()),
  preserveParagraphs: z.boolean(),
});

export type ChunkingConfig = z.infer<typeof ChunkingConfigSchema>;

export const DocumentToEmbedSchema = z.object({
  id: z.string(),
  title: z.string().optional(),
  content: z.string(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type DocumentToEmbed = z.infer<typeof DocumentToEmbedSchema>;

export const EmbeddedChunkSchema = z.object({
  id: z.string(),
  documentId: z.string(),
  chunkIndex: z.number().int().nonnegative(),
  text: z.string(),
  embedding: EmbeddingSchema,
  tokenCount: z.number().int().nonnegative(),
  startOffset: z.number().int().nonnegative(),
  endOffset: z.number().int().nonnegative(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type EmbeddedChunk = z.infer<typeof EmbeddedChunkSchema>;

export const EmbeddedDocumentSchema = z.object({
  documentId: z.string(),
  title: z.string().optional(),
  titleEmbedding: EmbeddingSchema.optional(),
  chunks: z.array(EmbeddedChunkSchema),
  totalTokens: z.number().int().nonnegative(),
  processingTimeMs: z.number().nonnegative(),
});

export type EmbeddedDocument = z.infer<typeof EmbeddedDocumentSchema>;

export const EmbeddingOptionsSchema = z.object({
  providerId: ProviderIdSchema.optional(),
  modelId: z.string().optional(),
  chunking: ChunkingConfigSchema.partial().optional(),
  embedTitle: z.boolean().optional(),
  skipIfTooLong: z.boolean().optional(),
});

export type EmbeddingOptions = z.infer<typeof EmbeddingOptionsSchema>;

export const SimilarityResultSchema = z.object({
  item: z.unknown(),
  score: z.number(),
  embedding: EmbeddingSchema,
});

export type SimilarityResult<T = unknown> = {
  item: T;
  score: number;
  embedding: Embedding;
};
