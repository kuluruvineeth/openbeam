import { z } from "zod";

export const HybridSearchParamsSchema = z.object({
  query: z.string(),
  teamId: z.string(),
  queryEmbedding: z.array(z.number()).optional(),
  limit: z.number().optional(),
  offset: z.number().optional(),
  bm25Weight: z.number().optional(),
  vectorWeight: z.number().optional(),
  minScore: z.number().optional(),
  connectorTypes: z.array(z.string()).optional(),
  documentTypes: z.array(z.string()).optional(),
  accessControlIds: z.array(z.string()).optional(),
});

export type HybridSearchParams = z.infer<typeof HybridSearchParamsSchema>;

export const ScoredDocumentSchema = z.object({
  id: z.string(),
  title: z.string(),
  content: z.string(),
  url: z.string().optional(),
  connectorType: z.string().optional(),
  relevanceScore: z.number(),
  bm25Score: z.number().optional(),
  vectorScore: z.number().optional(),
});

export type ScoredDocument = z.infer<typeof ScoredDocumentSchema>;

export const HybridSearchResultSchema = z.object({
  documents: z.array(ScoredDocumentSchema),
  total: z.number(),
  queryTime: z.number(),
  embeddingTime: z.number().optional(),
});

export type HybridSearchResult = z.infer<typeof HybridSearchResultSchema>;

export const RAGContextParamsSchema = z.object({
  query: z.string(),
  teamId: z.string(),
  maxTokens: z.number().optional(),
  topK: z.number().optional(),
  minScore: z.number().optional(),
  accessControlIds: z.array(z.string()).optional(),
  includeMetadata: z.boolean().optional(),
  sourceId: z.string().optional(),
  includeMedia: z.boolean().optional(),
});

export type RAGContextParams = z.infer<typeof RAGContextParamsSchema>;

export const RAGContextDocumentSchema = z.object({
  id: z.string(),
  title: z.string(),
  content: z.string(),
  url: z.string().optional(),
  source: z.string().optional(),
  connectorType: z.string().optional(),
  sourceType: z.enum(["document", "media"]).optional(),
  relevanceScore: z.number(),
  tokenCount: z.number(),
});

export type RAGContextDocument = z.infer<typeof RAGContextDocumentSchema>;

export const RAGContextSchema = z.object({
  documents: z.array(RAGContextDocumentSchema),
  totalTokens: z.number(),
  truncated: z.boolean(),
  retrievalTime: z.number(),
});

export type RAGContext = z.infer<typeof RAGContextSchema>;

export const RAGAnswerParamsSchema = RAGContextParamsSchema.extend({
  systemPrompt: z.string().optional(),
  modelId: z.string().optional(),
  temperature: z.number().optional(),
  stream: z.boolean().optional(),
});

export type RAGAnswerParams = z.infer<typeof RAGAnswerParamsSchema>;

export const AnswerCitationSchema = z.object({
  documentId: z.string(),
  title: z.string(),
  url: z.string().optional(),
  snippet: z.string(),
  relevanceScore: z.number(),
  connectorType: z.string().optional(),
  sourceType: z.enum(["document", "media"]).optional(),
});

export type AnswerCitation = z.infer<typeof AnswerCitationSchema>;

export const RAGAnswerSchema = z.object({
  answer: z.string(),
  citations: z.array(AnswerCitationSchema),
  context: RAGContextSchema,
  usage: z.object({
    promptTokens: z.number(),
    completionTokens: z.number(),
    totalTokens: z.number(),
  }),
  latencyMs: z.number(),
});

export type RAGAnswer = z.infer<typeof RAGAnswerSchema>;

export const CachedEmbeddingSchema = z.object({
  embedding: z.array(z.number()),
  text: z.string(),
  modelId: z.string(),
  createdAt: z.number(),
});

export type CachedEmbedding = z.infer<typeof CachedEmbeddingSchema>;

export const RerankParamsSchema = z.object({
  query: z.string(),
  documents: z.array(ScoredDocumentSchema),
  topK: z.number().optional(),
});

export type RerankParams = z.infer<typeof RerankParamsSchema>;

export const RerankResultSchema = z.object({
  documents: z.array(ScoredDocumentSchema),
  rerankTime: z.number(),
});

export type RerankResult = z.infer<typeof RerankResultSchema>;

export const QueryIntentSchema = z.enum([
  "factual",
  "exploratory",
  "navigational",
  "transactional",
  "conversational",
]);

export type QueryIntent = z.infer<typeof QueryIntentSchema>;

export const ExtractedEntitySchema = z.object({
  text: z.string(),
  type: z.string(),
  confidence: z.number(),
});

export type ExtractedEntity = z.infer<typeof ExtractedEntitySchema>;

export const TemporalContextSchema = z.object({
  hasTimeConstraint: z.boolean(),
  timeRange: z
    .object({
      start: z.date().optional(),
      end: z.date().optional(),
    })
    .optional(),
  relative: z.string().optional(),
});

export type TemporalContext = z.infer<typeof TemporalContextSchema>;

export const QueryAnalysisSchema = z.object({
  intent: QueryIntentSchema,
  entities: z.array(ExtractedEntitySchema),
  temporal: TemporalContextSchema.optional(),
  requiresContext: z.boolean(),
  suggestedFilters: z.record(z.string(), z.unknown()).optional(),
});

export type QueryAnalysis = z.infer<typeof QueryAnalysisSchema>;

export const ConversationMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string(),
  timestamp: z.date().optional(),
});

export type ConversationMessage = z.infer<typeof ConversationMessageSchema>;

export const ConversationContextSchema = z.object({
  messages: z.array(ConversationMessageSchema),
  summary: z.string().optional(),
});

export type ConversationContext = z.infer<typeof ConversationContextSchema>;

export const RAGRequestSchema = z.object({
  query: z.string(),
  teamId: z.string(),
  userId: z.string().optional(),
  conversationId: z.string().optional(),
  accessControlIds: z.array(z.string()).optional(),
  maxTokens: z.number().optional(),
  topK: z.number().optional(),
  includeMedia: z.boolean().optional(),
  stream: z.boolean().optional(),
});

export type RAGRequest = z.infer<typeof RAGRequestSchema>;

export const RAGChunkSchema = z.object({
  id: z.string(),
  documentId: z.string(),
  content: z.string(),
  score: z.number(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type RAGChunk = z.infer<typeof RAGChunkSchema>;

export const RAGCitationSchema = z.object({
  id: z.string(),
  documentId: z.string(),
  title: z.string(),
  url: z.string().optional(),
  snippet: z.string(),
  score: z.number(),
});

export type RAGCitation = z.infer<typeof RAGCitationSchema>;

export const GroundingConfidenceSchema = z.enum([
  "high",
  "medium",
  "low",
  "none",
]);

export type GroundingConfidence = z.infer<typeof GroundingConfidenceSchema>;

export const ClaimVerificationSchema = z.object({
  claim: z.string(),
  supported: z.boolean(),
  confidence: GroundingConfidenceSchema,
  evidence: z.array(z.string()),
});

export type ClaimVerification = z.infer<typeof ClaimVerificationSchema>;

export const GroundingResultSchema = z.object({
  isGrounded: z.boolean(),
  confidence: GroundingConfidenceSchema,
  claims: z.array(ClaimVerificationSchema),
  unsupportedClaims: z.array(z.string()),
});

export type GroundingResult = z.infer<typeof GroundingResultSchema>;

export const TokenUsageSchema = z.object({
  promptTokens: z.number(),
  completionTokens: z.number(),
  totalTokens: z.number(),
});

export type TokenUsage = z.infer<typeof TokenUsageSchema>;

export const RAGTimingSchema = z.object({
  retrievalMs: z.number(),
  rerankMs: z.number().optional(),
  generationMs: z.number(),
  totalMs: z.number(),
});

export type RAGTiming = z.infer<typeof RAGTimingSchema>;

export const RAGStreamChunkTypeSchema = z.enum([
  "start",
  "text",
  "citation",
  "done",
  "error",
]);

export type RAGStreamChunkType = z.infer<typeof RAGStreamChunkTypeSchema>;

export const RAGStreamChunkSchema = z.object({
  type: RAGStreamChunkTypeSchema,
  content: z.string().optional(),
  citation: RAGCitationSchema.optional(),
  error: z.string().optional(),
});

export type RAGStreamChunk = z.infer<typeof RAGStreamChunkSchema>;

export const RAGResponseSchema = z.object({
  answer: z.string(),
  citations: z.array(RAGCitationSchema),
  grounding: GroundingResultSchema.optional(),
  usage: TokenUsageSchema,
  timing: RAGTimingSchema,
});

export type RAGResponse = z.infer<typeof RAGResponseSchema>;

export const AssembledContextSchema = z.object({
  chunks: z.array(RAGChunkSchema),
  totalTokens: z.number(),
  truncated: z.boolean(),
});

export type AssembledContext = z.infer<typeof AssembledContextSchema>;

export const ContextAssemblyConfigSchema = z.object({
  maxTokens: z.number(),
  overlapTokens: z.number().optional(),
  preserveOrder: z.boolean().optional(),
});

export type ContextAssemblyConfig = z.infer<typeof ContextAssemblyConfigSchema>;

export const ChunkExtractionOptionsSchema = z.object({
  maxChunks: z.number().optional(),
  minScore: z.number().optional(),
  includeMetadata: z.boolean().optional(),
});

export type ChunkExtractionOptions = z.infer<
  typeof ChunkExtractionOptionsSchema
>;

export const RAGOrchestratorConfigSchema = z.object({
  maxContextTokens: z.number().optional(),
  topK: z.number().optional(),
  rerankEnabled: z.boolean().optional(),
  groundingEnabled: z.boolean().optional(),
  streamEnabled: z.boolean().optional(),
});

export type RAGOrchestratorConfig = z.infer<typeof RAGOrchestratorConfigSchema>;
