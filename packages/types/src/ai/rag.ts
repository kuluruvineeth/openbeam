import { z } from "zod";

export const QueryIntentSchema = z.enum([
  "question",
  "search",
  "clarification",
  "followup",
  "command",
  "comparison",
  "definition",
  "howto",
]);

export type QueryIntent = z.infer<typeof QueryIntentSchema>;

export const EntityTypeSchema = z.enum([
  "person",
  "organization",
  "project",
  "technology",
  "document",
  "location",
  "date",
  "product",
]);

export type EntityType = z.infer<typeof EntityTypeSchema>;

export const ExtractedEntitySchema = z.object({
  text: z.string(),
  type: EntityTypeSchema,
  confidence: z.number().min(0).max(1),
  normalized: z.string().optional(),
});

export type ExtractedEntity = z.infer<typeof ExtractedEntitySchema>;

export const TemporalContextTypeSchema = z.enum(["absolute", "relative"]);

export type TemporalContextType = z.infer<typeof TemporalContextTypeSchema>;

export const TemporalContextSchema = z.object({
  type: TemporalContextTypeSchema,
  start: z.date().optional(),
  end: z.date().optional(),
  description: z.string(),
});

export type TemporalContext = z.infer<typeof TemporalContextSchema>;

export const QueryAnalysisSchema = z.object({
  originalQuery: z.string(),
  normalizedQuery: z.string(),
  intent: QueryIntentSchema,
  subQueries: z.array(z.string()),
  entities: z.array(ExtractedEntitySchema),
  temporalContext: TemporalContextSchema.nullable(),
  requiresContext: z.boolean(),
  confidence: z.number().min(0).max(1),
  keywords: z.array(z.string()),
});

export type QueryAnalysis = z.infer<typeof QueryAnalysisSchema>;

export const PageRangeSchema = z.tuple([z.number(), z.number()]);

export type PageRange = z.infer<typeof PageRangeSchema>;

export const RAGChunkSchema = z.object({
  id: z.string(),
  documentId: z.string(),
  documentTitle: z.string(),
  documentUrl: z.string().optional(),
  sourceType: z.string(),
  content: z.string(),
  startOffset: z.number().int().nonnegative(),
  endOffset: z.number().int().nonnegative(),
  score: z.number(),
  tokenCount: z.number().int().nonnegative(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  sectionId: z.string().optional(),
  sectionTitle: z.string().optional(),
  sectionPath: z.array(z.string()).optional(),
  sectionLevel: z.number().int().nonnegative().optional(),
  pageNumber: z.number().int().positive().optional(),
  pageRange: PageRangeSchema.optional(),
  elementTypes: z.array(z.string()).optional(),
});

export type RAGChunk = z.infer<typeof RAGChunkSchema>;

export const RAGCitationSchema = z.object({
  id: z.string(),
  chunkId: z.string(),
  documentId: z.string(),
  documentTitle: z.string(),
  documentUrl: z.string().optional(),
  sourceType: z.string(),
  snippet: z.string(),
  relevanceScore: z.number(),
  position: z.number().int().nonnegative(),
  pageNumber: z.number().int().positive().optional(),
  pageRange: PageRangeSchema.optional(),
  sectionPath: z.array(z.string()).optional(),
  sectionTitle: z.string().optional(),
});

export type RAGCitation = z.infer<typeof RAGCitationSchema>;

export const ConversationRoleSchema = z.enum(["user", "assistant"]);

export type ConversationRole = z.infer<typeof ConversationRoleSchema>;

export const ConversationTurnSchema = z.object({
  role: ConversationRoleSchema,
  content: z.string(),
  timestamp: z.number(),
  citations: z.array(RAGCitationSchema).optional(),
});

export type ConversationTurn = z.infer<typeof ConversationTurnSchema>;

export const GroundingConfidenceSchema = z.enum([
  "high",
  "medium",
  "low",
  "uncertain",
]);

export type GroundingConfidence = z.infer<typeof GroundingConfidenceSchema>;

export const ClaimVerificationSchema = z.object({
  claim: z.string(),
  supported: z.boolean(),
  evidenceChunkId: z.string().nullable(),
  evidenceSnippet: z.string().nullable(),
  confidence: z.number().min(0).max(1),
});

export type ClaimVerification = z.infer<typeof ClaimVerificationSchema>;

export const GroundingResultSchema = z.object({
  claims: z.array(ClaimVerificationSchema),
  overallScore: z.number(),
  confidence: GroundingConfidenceSchema,
  unsupportedClaims: z.array(z.string()),
});

export type GroundingResult = z.infer<typeof GroundingResultSchema>;

export const RAGCitationSimpleSchema = z.object({
  documentId: z.string(),
  chunkId: z.string(),
  text: z.string(),
  relevanceScore: z.number(),
  documentTitle: z.string().optional(),
  documentUrl: z.string().optional(),
  pageNumber: z.number().int().positive().optional(),
});

export type RAGCitationSimple = z.infer<typeof RAGCitationSimpleSchema>;

export const GroundedAnswerSchema = z.object({
  answer: z.string(),
  citations: z.array(RAGCitationSimpleSchema),
  groundingScore: z.number(),
  confidence: z.number(),
  ungroundedClaims: z.array(z.string()),
  suggestedFollowUp: z.string().optional(),
});

export type GroundedAnswer = z.infer<typeof GroundedAnswerSchema>;

export const RAGTokenUsageSchema = z.object({
  promptTokens: z.number().int().nonnegative(),
  completionTokens: z.number().int().nonnegative(),
  totalTokens: z.number().int().nonnegative(),
  cachedTokens: z.number().int().nonnegative().optional(),
});

export type RAGTokenUsage = z.infer<typeof RAGTokenUsageSchema>;

export const RAGTimingSchema = z.object({
  analysisMs: z.number().nonnegative(),
  retrievalMs: z.number().nonnegative(),
  rerankingMs: z.number().nonnegative(),
  generationMs: z.number().nonnegative(),
  groundingMs: z.number().nonnegative(),
  totalMs: z.number().nonnegative(),
  firstTokenMs: z.number().nonnegative().nullable(),
});

export type RAGTiming = z.infer<typeof RAGTimingSchema>;

export const RAGResponseSchema = z.object({
  answer: z.string(),
  citations: z.array(RAGCitationSchema),
  grounding: GroundingResultSchema.nullable(),
  usage: RAGTokenUsageSchema,
  timing: RAGTimingSchema,
  confidence: GroundingConfidenceSchema,
  followUpQuestions: z.array(z.string()).optional(),
});

export type RAGResponse = z.infer<typeof RAGResponseSchema>;

export const RAGStreamEventTypeSchema = z.enum([
  "analysis",
  "retrieval",
  "context",
  "text",
  "citation",
  "grounding",
  "done",
  "error",
]);

export type RAGStreamEventType = z.infer<typeof RAGStreamEventTypeSchema>;

export const RAGStreamEventSchema = z.object({
  type: RAGStreamEventTypeSchema,
  content: z.string().optional(),
  citation: RAGCitationSchema.optional(),
  grounding: GroundingResultSchema.optional(),
  analysis: QueryAnalysisSchema.optional(),
  usage: RAGTokenUsageSchema.optional(),
  error: z.string().optional(),
});

export type RAGStreamEvent = z.infer<typeof RAGStreamEventSchema>;

export const CitationStyleSchema = z.enum(["inline", "footnote", "endnote"]);

export type CitationStyle = z.infer<typeof CitationStyleSchema>;

export const RAGConfigSchema = z.object({
  maxChunks: z.number().int().positive(),
  maxContextTokens: z.number().int().positive(),
  reserveAnswerTokens: z.number().int().positive(),
  diversityWeight: z.number().min(0).max(1),
  groundingThreshold: z.number().min(0).max(1),
  includeMetadata: z.boolean(),
  citationStyle: CitationStyleSchema,
});

export type RAGConfig = z.infer<typeof RAGConfigSchema>;

export const ChunkingSplitOnSchema = z.enum(["sentence", "paragraph", "token"]);

export type ChunkingSplitOn = z.infer<typeof ChunkingSplitOnSchema>;

export const RAGChunkingOptionsSchema = z.object({
  maxChunkSize: z.number().int().positive(),
  chunkOverlap: z.number().int().nonnegative(),
  minChunkSize: z.number().int().positive(),
  splitOn: ChunkingSplitOnSchema,
});

export type RAGChunkingOptions = z.infer<typeof RAGChunkingOptionsSchema>;

export const RerankingOptionsSchema = z.object({
  model: z.string().optional(),
  topK: z.number().int().positive(),
  diversityWeight: z.number().min(0).max(1),
  minScore: z.number().min(0).max(1),
});

export type RerankingOptions = z.infer<typeof RerankingOptionsSchema>;
