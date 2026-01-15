import { z } from "zod";

export const ProviderIdSchema = z.enum([
  "openai",
  "anthropic",
  "google",
  "azure",
  "ollama",
  "twelvelabs",
]);

export type ProviderId = z.infer<typeof ProviderIdSchema>;

export const ModelPricingSchema = z.object({
  inputPer1M: z.number(),
  outputPer1M: z.number(),
  cachePer1M: z.number().optional(),
  reasoningPer1M: z.number().optional(),
});

export type ModelPricing = z.infer<typeof ModelPricingSchema>;

export const ChatModelSchema = z.object({
  id: z.string(),
  name: z.string(),
  provider: ProviderIdSchema,
  contextWindow: z.number().int().positive(),
  maxOutputTokens: z.number().int().positive(),
  supportsTools: z.boolean(),
  supportsVision: z.boolean(),
  supportsStreaming: z.boolean(),
  pricing: ModelPricingSchema,
});

export type ChatModel = z.infer<typeof ChatModelSchema>;

export const EmbeddingModelSchema = z.object({
  id: z.string(),
  name: z.string(),
  provider: ProviderIdSchema,
  dimensions: z.number().int().positive(),
  maxTokens: z.number().int().positive(),
  pricing: z.object({
    inputPer1M: z.number(),
  }),
});

export type EmbeddingModel = z.infer<typeof EmbeddingModelSchema>;
