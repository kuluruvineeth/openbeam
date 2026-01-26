import { z } from "zod";

import { ProviderIdSchema } from "../providers";

export { type ProviderId, ProviderIdSchema } from "../providers";

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
  supportsSparse: z.boolean().optional(),
  supportsMultilingual: z.boolean().optional(),
  isLocal: z.boolean().optional(),
  pricing: z.object({
    inputPer1M: z.number(),
  }),
});

export type EmbeddingModel = z.infer<typeof EmbeddingModelSchema>;

export const RerankerModelSchema = z.object({
  id: z.string(),
  name: z.string(),
  provider: ProviderIdSchema,
  maxDocuments: z.number().int().positive(),
  supportsMultilingual: z.boolean(),
  isLocal: z.boolean().optional(),
  pricing: z.object({
    perSearch: z.number(),
  }),
});

export type RerankerModel = z.infer<typeof RerankerModelSchema>;

export const TTSModelSchema = z.object({
  id: z.string(),
  name: z.string(),
  provider: ProviderIdSchema,
  maxCharacters: z.number().int().positive().optional(),
  supportedLanguages: z.number().int().positive(),
  supportsCloning: z.boolean(),
  supportsStreaming: z.boolean(),
  latencyMs: z.number().int().positive().optional(),
  pricing: z.object({
    perCharacter: z.number().optional(),
    perMinute: z.number().optional(),
  }),
});

export type TTSModel = z.infer<typeof TTSModelSchema>;

export const STTModelSchema = z.object({
  id: z.string(),
  name: z.string(),
  provider: ProviderIdSchema,
  supportedLanguages: z.number().int().positive(),
  supportsRealtime: z.boolean(),
  supportsDiarization: z.boolean(),
  supportsPunctuation: z.boolean(),
  wordErrorRate: z.number().optional(),
  isLocal: z.boolean().optional(),
  pricing: z.object({
    perMinute: z.number(),
  }),
});

export type STTModel = z.infer<typeof STTModelSchema>;

export const VisionModelSchema = z.object({
  id: z.string(),
  name: z.string(),
  provider: ProviderIdSchema,
  maxImageSize: z.number().int().positive().optional(),
  supportsMultipleImages: z.boolean(),
  supportsVideo: z.boolean(),
  supportedFormats: z.array(z.string()),
  pricing: z.object({
    perImage: z.number().optional(),
    perMinuteVideo: z.number().optional(),
  }),
});

export type VisionModel = z.infer<typeof VisionModelSchema>;

export const VideoModelSchema = z.object({
  id: z.string(),
  name: z.string(),
  provider: ProviderIdSchema,
  maxDurationSeconds: z.number().int().positive(),
  supportsAudio: z.boolean(),
  supportsSearch: z.boolean(),
  embeddingDimensions: z.number().int().positive().optional(),
  pricing: z.object({
    perMinuteIndexing: z.number().optional(),
    perSearch: z.number().optional(),
    perMinuteGeneration: z.number().optional(),
  }),
});

export type VideoModel = z.infer<typeof VideoModelSchema>;

export const ImageModelSchema = z.object({
  id: z.string(),
  name: z.string(),
  provider: ProviderIdSchema,
  maxResolution: z.string(),
  supportsInpainting: z.boolean(),
  supportsOutpainting: z.boolean(),
  supportsVariations: z.boolean(),
  isLocal: z.boolean().optional(),
  pricing: z.object({
    perImage: z.number(),
  }),
});

export type ImageModel = z.infer<typeof ImageModelSchema>;
