import { z } from "zod";

export const EdgeGenerateOptionsSchema = z.object({
  maxTokens: z.number().int().positive().default(512),
  temperature: z.number().min(0).max(2).default(0.3),
  stopSequences: z.array(z.string()).optional(),
  systemPrompt: z.string().optional(),
});

export type EdgeGenerateOptions = z.infer<typeof EdgeGenerateOptionsSchema>;

export interface EdgeSLM {
  generate(
    prompt: string,
    options?: Partial<EdgeGenerateOptions>
  ): Promise<EdgeSLMResponse>;
  isAvailable(): Promise<boolean>;
  modelId(): string;
}

export const EdgeSLMResponseSchema = z.object({
  text: z.string(),
  tokensUsed: z.number().int().nonnegative(),
  latencyMs: z.number().nonnegative(),
  truncated: z.boolean().default(false),
});

export type EdgeSLMResponse = z.infer<typeof EdgeSLMResponseSchema>;

export interface EdgeEmbeddingModel {
  embed(text: string): Promise<Float32Array>;
  embedBatch(texts: string[]): Promise<Float32Array[]>;
  dimensions(): number;
  modelId(): string;
  isAvailable(): Promise<boolean>;
}

export const EdgeRAGResponseSchema = z.object({
  answer: z.string(),
  sources: z.array(
    z.object({
      documentId: z.string(),
      title: z.string(),
      snippet: z.string(),
      score: z.number(),
    })
  ),
  queryRewrite: z.string().optional(),
  tokensUsed: z.number().int().nonnegative(),
  latencyMs: z.number().nonnegative(),
  searchLatencyMs: z.number().nonnegative(),
  generationLatencyMs: z.number().nonnegative(),
});

export type EdgeRAGResponse = z.infer<typeof EdgeRAGResponseSchema>;

export const NEREntitySchema = z.object({
  text: z.string(),
  label: z.string(),
  start: z.number().int().nonnegative(),
  end: z.number().int().nonnegative(),
  confidence: z.number().min(0).max(1),
});

export type NEREntity = z.infer<typeof NEREntitySchema>;

export const QueryClassificationSchema = z.object({
  intent: z.enum([
    "search",
    "question",
    "navigation",
    "command",
    "conversation",
  ]),
  confidence: z.number().min(0).max(1),
  entities: z.array(NEREntitySchema).default([]),
  suggestedRewrite: z.string().optional(),
});

export type QueryClassification = z.infer<typeof QueryClassificationSchema>;
