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

export const CitationStyleSchema = z.enum(["inline", "footnote", "none"]);

export type CitationStyle = z.infer<typeof CitationStyleSchema>;

export const ChunkStrategySchema = z.enum([
  "fixed",
  "semantic",
  "sentence",
  "paragraph",
]);

export type ChunkStrategy = z.infer<typeof ChunkStrategySchema>;

export const RagNodeConfigSchema = z.object({
  searchType: z.enum(["hybrid", "semantic", "keyword"]).default("hybrid"),
  topK: z.number().min(1).max(50).default(10),
  minScore: z.number().min(0).max(1).default(0.5),
  diversityPenalty: z.number().min(0).max(1).default(0),
  rerank: z.boolean().default(true),
  rerankModel: z.string().optional(),
  connectorTypes: z.array(z.string()).optional(),

  synthesize: z.boolean().default(true),
  model: z.string().optional(),
  systemPrompt: z.string().optional(),
  citationStyle: CitationStyleSchema.default("inline"),

  queryExpansion: z.boolean().default(false),

  chunkStrategy: ChunkStrategySchema.default("semantic"),
  maxChunkSize: z.number().min(128).max(2048).default(512),
  chunkOverlap: z.number().min(0).max(256).default(50),

  deduplicate: z.boolean().default(true),
  dedupeThreshold: z.number().min(0).max(1).default(0.95),
});

export type RagNodeConfig = z.infer<typeof RagNodeConfigSchema>;

export const RagChunkSchema = z.object({
  id: z.string(),
  content: z.string(),
  score: z.number(),
  documentId: z.string(),
  documentTitle: z.string(),
  connectorType: z.string(),
  url: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type RagChunk = z.infer<typeof RagChunkSchema>;

export const RagExecutionResultSchema = z.object({
  chunks: z.array(RagChunkSchema),
  answer: z.string().optional(),
  citations: z.array(CitationSchema),
  usage: z.object({
    inputTokens: z.number(),
    outputTokens: z.number(),
    embeddingTokens: z.number(),
    latencyMs: z.number(),
  }),
});

export type RagExecutionResult = z.infer<typeof RagExecutionResultSchema>;

export const SummarizationStrategySchema = z.enum([
  "auto",
  "stuff",
  "map_reduce",
  "refine",
]);

export type SummarizationStrategy = z.infer<typeof SummarizationStrategySchema>;

export const SummaryOutputFormatSchema = z.enum([
  "paragraph",
  "bullets",
  "executive",
  "key_points",
  "action_items",
  "timeline",
  "qa_pairs",
]);

export type SummaryOutputFormat = z.infer<typeof SummaryOutputFormatSchema>;

export const SummaryLengthSchema = z.enum([
  "brief",
  "standard",
  "detailed",
  "custom",
]);

export type SummaryLength = z.infer<typeof SummaryLengthSchema>;

export const SummaryFocusAreaSchema = z.enum([
  "decisions",
  "action_items",
  "key_metrics",
  "people",
  "dates",
  "risks",
  "opportunities",
  "questions",
]);

export type SummaryFocusArea = z.infer<typeof SummaryFocusAreaSchema>;

export const SummarizeNodeConfigSchema = z.object({
  strategy: SummarizationStrategySchema.default("auto"),
  model: z.string().optional(),

  outputFormat: SummaryOutputFormatSchema.default("paragraph"),
  length: SummaryLengthSchema.default("standard"),
  maxWords: z.number().positive().optional(),
  maxTokens: z.number().positive().optional(),

  focusAreas: z.array(SummaryFocusAreaSchema).optional(),
  extractEntities: z.boolean().default(false),
  preserveStructure: z.boolean().default(false),

  includeCitations: z.boolean().default(false),
  citationStyle: CitationStyleSchema.default("inline"),

  chunkSize: z.number().min(256).max(4096).default(1000),
  chunkOverlap: z.number().min(0).max(512).default(100),

  temperature: z.number().min(0).max(1).default(0.3),
  customInstructions: z.string().optional(),
  language: z.string().optional(),
});

export type SummarizeNodeConfig = z.infer<typeof SummarizeNodeConfigSchema>;

export const ActionItemSchema = z.object({
  task: z.string(),
  assignee: z.string().optional(),
  dueDate: z.string().optional(),
});

export type ActionItem = z.infer<typeof ActionItemSchema>;

export const ExtractedEntitySchema = z.object({
  text: z.string(),
  type: z.string(),
  count: z.number(),
});

export type ExtractedEntity = z.infer<typeof ExtractedEntitySchema>;

export const SummarizeExecutionResultSchema = z.object({
  summary: z.string(),
  format: SummaryOutputFormatSchema,

  keyPoints: z.array(z.string()).optional(),
  actionItems: z.array(ActionItemSchema).optional(),
  entities: z.array(ExtractedEntitySchema).optional(),

  citations: z.array(CitationSchema).optional(),

  usage: z.object({
    inputTokens: z.number(),
    outputTokens: z.number(),
    latencyMs: z.number(),
    chunksProcessed: z.number().optional(),
  }),

  strategyUsed: SummarizationStrategySchema,
});

export type SummarizeExecutionResult = z.infer<
  typeof SummarizeExecutionResultSchema
>;

export const ExtractionModeSchema = z.enum([
  "schema",
  "template",
  "example",
  "natural",
]);

export type ExtractionMode = z.infer<typeof ExtractionModeSchema>;

export const FieldTypeSchema = z.enum([
  "string",
  "number",
  "boolean",
  "date",
  "email",
  "url",
  "phone",
  "currency",
  "array",
  "object",
]);

export type FieldType = z.infer<typeof FieldTypeSchema>;

export const FieldValidationSchema = z.object({
  pattern: z.string().optional(),
  minLength: z.number().optional(),
  maxLength: z.number().optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  enum: z.array(z.string()).optional(),
});

export type FieldValidation = z.infer<typeof FieldValidationSchema>;

export const ExtractionFieldSchema: z.ZodType<ExtractionField> = z.lazy(() =>
  z.object({
    id: z.string(),
    name: z.string(),
    type: FieldTypeSchema,
    description: z.string().optional(),
    required: z.boolean().default(false),
    validation: FieldValidationSchema.optional(),
    nested: z.array(ExtractionFieldSchema).optional(),
  })
);

export interface ExtractionField {
  id: string;
  name: string;
  type: FieldType;
  description?: string;
  required?: boolean;
  validation?: FieldValidation;
  nested?: ExtractionField[];
}

export const ExtractionTemplateSchema = z.enum([
  "invoice",
  "receipt",
  "contract",
  "resume",
  "email",
  "meeting_notes",
  "product",
  "contact",
  "event",
  "custom",
]);

export type ExtractionTemplate = z.infer<typeof ExtractionTemplateSchema>;

export const EntityTypeSchema = z.enum([
  "person",
  "organization",
  "location",
  "date",
  "money",
  "percent",
  "time",
  "email",
  "phone",
  "url",
]);

export type EntityType = z.infer<typeof EntityTypeSchema>;

export const ExtractNodeConfigSchema = z.object({
  mode: ExtractionModeSchema.default("schema"),

  fields: z.array(ExtractionFieldSchema).optional(),

  template: ExtractionTemplateSchema.optional(),
  customTemplate: z
    .object({
      name: z.string(),
      fields: z.array(ExtractionFieldSchema),
    })
    .optional(),

  jsonExample: z.string().optional(),
  inferredSchema: z.array(ExtractionFieldSchema).optional(),

  extractionPrompt: z.string().optional(),

  model: z.string().optional(),
  temperature: z.number().min(0).max(1).default(0.1),

  strictMode: z.boolean().default(true),
  includeConfidence: z.boolean().default(false),
  handleArrays: z.enum(["first", "all", "merge"]).default("all"),
  nullHandling: z.enum(["omit", "null", "default"]).default("omit"),

  extractEntities: z.boolean().default(false),
  entityTypes: z.array(EntityTypeSchema).optional(),
});

export type ExtractNodeConfig = z.infer<typeof ExtractNodeConfigSchema>;

export const ExtractedValueSchema = z.object({
  field: z.string(),
  value: z.unknown(),
  confidence: z.number().optional(),
  source: z.string().optional(),
});

export type ExtractedValue = z.infer<typeof ExtractedValueSchema>;

export const NerEntitySchema = z.object({
  text: z.string(),
  type: EntityTypeSchema,
  start: z.number(),
  end: z.number(),
  confidence: z.number(),
});

export type NerEntity = z.infer<typeof NerEntitySchema>;

export const ExtractionResultSchema = z.object({
  values: z.array(ExtractedValueSchema),
  entities: z.array(NerEntitySchema).optional(),
  usage: z.object({
    inputTokens: z.number(),
    outputTokens: z.number(),
    latencyMs: z.number(),
  }),
  raw: z.unknown().optional(),
});

export type ExtractionResult = z.infer<typeof ExtractionResultSchema>;

export const ClassificationModeSchema = z.enum([
  "categories",
  "routing",
  "zero_shot",
]);

export type ClassificationMode = z.infer<typeof ClassificationModeSchema>;

export const ClassifyCategorySchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  examples: z.array(z.string()).optional(),
  keywords: z.array(z.string()).optional(),
  color: z.string().optional(),
  isFallback: z.boolean().optional(),
});

export type ClassifyCategory = z.infer<typeof ClassifyCategorySchema>;

export const FallbackBehaviorSchema = z.enum([
  "discard",
  "other_branch",
  "lowest_match",
  "error",
]);

export type FallbackBehavior = z.infer<typeof FallbackBehaviorSchema>;

export const ClassifyNodeConfigSchema = z.object({
  mode: ClassificationModeSchema.default("categories"),
  categories: z.array(ClassifyCategorySchema).default([]),
  allowMultiple: z.boolean().default(false),

  model: z.string().optional(),
  temperature: z.number().min(0).max(1).default(0.1),

  confidenceThreshold: z.number().min(0).max(1).default(0.7),
  includeConfidence: z.boolean().default(false),

  fallbackBehavior: FallbackBehaviorSchema.default("other_branch"),
  fallbackCategoryId: z.string().optional(),

  systemPromptTemplate: z.string().optional(),
  instructions: z.string().optional(),
  enableAutoFix: z.boolean().default(true),

  enableMemory: z.boolean().default(false),
});

export type ClassifyNodeConfig = z.infer<typeof ClassifyNodeConfigSchema>;

export const ClassificationResultSchema = z.object({
  categoryId: z.string(),
  categoryName: z.string(),
  confidence: z.number(),
  reasoning: z.string().optional(),
});

export type ClassificationResult = z.infer<typeof ClassificationResultSchema>;

export const ClassifyExecutionResultSchema = z.object({
  results: z.array(ClassificationResultSchema),
  isFallback: z.boolean(),
  usage: z.object({
    inputTokens: z.number(),
    outputTokens: z.number(),
    latencyMs: z.number(),
  }),
});

export type ClassifyExecutionResult = z.infer<
  typeof ClassifyExecutionResultSchema
>;

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
