import { z } from "zod";

export const LlmNodeConfigSchema = z.object({
  model: z.string(),
  systemPrompt: z.string(),
  temperature: z.number().min(0).max(2).default(0.7),
  maxTokens: z.number().positive().default(4096),
  tools: z.array(z.string()).optional(),
  responseFormat: z.enum(["text", "json", "structured"]).default("text"),
  outputSchema: z.unknown().optional(),
  streaming: z.boolean().default(true),
  topP: z.number().min(0).max(1).optional(),
  frequencyPenalty: z.number().min(0).max(2).optional(),
  presencePenalty: z.number().min(0).max(2).optional(),
  stop: z.array(z.string()).optional(),
});

export type LlmNodeConfig = z.infer<typeof LlmNodeConfigSchema>;

export const ImageSizeSchema = z.enum([
  "256x256",
  "512x512",
  "1024x1024",
  "1792x1024",
  "1024x1792",
]);

export type ImageSize = z.infer<typeof ImageSizeSchema>;

export const ImageQualitySchema = z.enum(["standard", "hd"]);

export type ImageQuality = z.infer<typeof ImageQualitySchema>;

export const ImageStyleSchema = z.enum(["vivid", "natural"]);

export type ImageStyle = z.infer<typeof ImageStyleSchema>;

export const ImageNodeConfigSchema = z.object({
  model: z.string().default("dall-e-3"),
  size: ImageSizeSchema.default("1024x1024"),
  quality: ImageQualitySchema.default("standard"),
  style: ImageStyleSchema.default("vivid"),
  numberOfImages: z.number().min(1).max(4).default(1),
  negativePrompt: z.string().optional(),
  seed: z.number().optional(),
  guidanceScale: z.number().min(1).max(20).optional(),
  enhancePrompt: z.boolean().default(false),
});

export type ImageNodeConfig = z.infer<typeof ImageNodeConfigSchema>;

export const AudioFormatSchema = z.enum(["mp3", "wav", "ogg", "flac"]);

export type AudioFormat = z.infer<typeof AudioFormatSchema>;

export const VoiceSettingsSchema = z.object({
  stability: z.number().min(0).max(1).default(0.5),
  similarityBoost: z.number().min(0).max(1).default(0.75),
  style: z.number().min(0).max(1).optional(),
  speakerBoost: z.boolean().optional(),
});

export type VoiceSettings = z.infer<typeof VoiceSettingsSchema>;

export const AudioNodeConfigSchema = z.object({
  model: z.string().default("eleven_multilingual_v2"),
  voice: z.string(),
  voiceSettings: VoiceSettingsSchema.optional(),
  outputFormat: AudioFormatSchema.default("mp3"),
  speed: z.number().min(0.25).max(4).default(1),
});

export type AudioNodeConfig = z.infer<typeof AudioNodeConfigSchema>;

export const VideoAspectRatioSchema = z.enum(["16:9", "9:16", "1:1", "4:3"]);

export type VideoAspectRatio = z.infer<typeof VideoAspectRatioSchema>;

export const VideoNodeConfigSchema = z.object({
  model: z.string().default("runway-gen3"),
  aspectRatio: VideoAspectRatioSchema.default("16:9"),
  duration: z.number().min(3).max(60).default(5),
  style: z.string().optional(),
  resolution: z.enum(["720p", "1080p", "4k"]).default("1080p"),
  fps: z.number().min(24).max(60).default(30),
  motionAmount: z.number().min(0).max(100).optional(),
  seed: z.number().optional(),
  cameraMotion: z.string().optional(),
});

export type VideoNodeConfig = z.infer<typeof VideoNodeConfigSchema>;

export const CostBracketSchema = z.enum([
  "lowest",
  "low",
  "medium",
  "high",
  "highest",
]);

export type CostBracket = z.infer<typeof CostBracketSchema>;

export const ModelCostSchema = z.object({
  inputPer1k: z.number(),
  outputPer1k: z.number(),
  bracket: CostBracketSchema,
});

export type ModelCost = z.infer<typeof ModelCostSchema>;

export const TokenUsageSchema = z.object({
  input: z.number(),
  output: z.number(),
  total: z.number(),
  estimatedCost: z.number(),
});

export type TokenUsage = z.infer<typeof TokenUsageSchema>;

export const CitationSchema = z.object({
  documentId: z.string(),
  chunkId: z.string().optional(),
  title: z.string(),
  snippet: z.string(),
  relevanceScore: z.number().optional(),
  url: z.string().optional(),
});

export type Citation = z.infer<typeof CitationSchema>;

export const GeneratedImageSchema = z.object({
  id: z.string(),
  url: z.string(),
  revisedPrompt: z.string().optional(),
  width: z.number(),
  height: z.number(),
});

export type GeneratedImage = z.infer<typeof GeneratedImageSchema>;

export const GeneratedAudioSchema = z.object({
  id: z.string(),
  url: z.string(),
  duration: z.number(),
  format: AudioFormatSchema,
});

export type GeneratedAudio = z.infer<typeof GeneratedAudioSchema>;

export const GeneratedVideoSchema = z.object({
  id: z.string(),
  url: z.string(),
  thumbnailUrl: z.string().optional(),
  duration: z.number(),
  width: z.number(),
  height: z.number(),
});

export type GeneratedVideo = z.infer<typeof GeneratedVideoSchema>;

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
