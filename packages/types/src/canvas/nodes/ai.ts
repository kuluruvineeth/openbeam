import { z } from "zod";

export const LlmNodeConfigSchema = z.object({
  model: z.string(),
  systemPrompt: z.string(),
  temperature: z.number().min(0).max(2).default(0.7),
  maxTokens: z.number().positive().default(4096),
  tools: z.array(z.string()).optional(),
  responseFormat: z.enum(["text", "json", "structured"]).default("text"),
  outputSchema: z.unknown().optional(),
});

export type LlmNodeConfig = z.infer<typeof LlmNodeConfigSchema>;

export const RagNodeConfigSchema = z.object({
  searchType: z.enum(["hybrid", "semantic", "keyword"]).default("hybrid"),
  topK: z.number().positive().default(10),
  rerank: z.boolean().default(true),
  minScore: z.number().min(0).max(1).default(0.5),
  connectorTypes: z.array(z.string()).optional(),
  model: z.string().optional(),
  systemPrompt: z.string().optional(),
});

export type RagNodeConfig = z.infer<typeof RagNodeConfigSchema>;

export const SummarizeNodeConfigSchema = z.object({
  style: z.enum(["bullets", "paragraph", "executive"]).default("paragraph"),
  maxLength: z.number().positive().optional(),
  model: z.string().optional(),
});

export type SummarizeNodeConfig = z.infer<typeof SummarizeNodeConfigSchema>;

export const ExtractNodeConfigSchema = z.object({
  schema: z.unknown(),
  examples: z.array(z.unknown()).optional(),
  model: z.string().optional(),
});

export type ExtractNodeConfig = z.infer<typeof ExtractNodeConfigSchema>;

export const ClassifyNodeConfigSchema = z.object({
  categories: z.array(
    z.object({
      name: z.string(),
      description: z.string().optional(),
    })
  ),
  allowMultiple: z.boolean().default(false),
  model: z.string().optional(),
});

export type ClassifyNodeConfig = z.infer<typeof ClassifyNodeConfigSchema>;

export const EmbeddingsNodeConfigSchema = z.object({
  model: z.string().default("text-embedding-3-small"),
  dimensions: z.number().positive().optional(),
  batchSize: z.number().positive().default(100),
  normalize: z.boolean().default(true),
});

export type EmbeddingsNodeConfig = z.infer<typeof EmbeddingsNodeConfigSchema>;

export const RerankNodeConfigSchema = z.object({
  model: z.string().default("cohere-rerank-v3"),
  topK: z.number().positive().default(10),
  threshold: z.number().min(0).max(1).optional(),
  returnScores: z.boolean().default(true),
});

export type RerankNodeConfig = z.infer<typeof RerankNodeConfigSchema>;

export const ChunkNodeConfigSchema = z.object({
  strategy: z
    .enum(["fixed", "semantic", "sentence", "paragraph"])
    .default("semantic"),
  maxChunkSize: z.number().positive().default(512),
  overlap: z.number().min(0).default(50),
  preserveStructure: z.boolean().default(true),
});

export type ChunkNodeConfig = z.infer<typeof ChunkNodeConfigSchema>;

export const MergeNodeConfigSchema = z.object({
  strategy: z
    .enum(["concatenate", "interleave", "deduplicate"])
    .default("concatenate"),
  separator: z.string().default("\n\n"),
  maxLength: z.number().positive().optional(),
  dedupeThreshold: z.number().min(0).max(1).default(0.95),
});

export type MergeNodeConfig = z.infer<typeof MergeNodeConfigSchema>;
