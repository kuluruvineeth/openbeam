import { z } from "zod";

export const MemoryTypeSchema = z.enum(["episodic", "semantic", "procedural"]);

export type MemoryType = z.infer<typeof MemoryTypeSchema>;

export const MemoryMetadataSchema = z.object({
  teamId: z.string(),
  userId: z.string().optional(),
  sessionId: z.string().optional(),
  agentId: z.string().optional(),
  tags: z.array(z.string()).optional(),
  source: z.string().optional(),
  importance: z.number().optional(),
  associations: z.array(z.string()).optional(),
});

export type MemoryMetadata = z.infer<typeof MemoryMetadataSchema>;

export const MemoryEntrySchema = z.object({
  id: z.string(),
  type: MemoryTypeSchema,
  content: z.string(),
  embedding: z.array(z.number()).optional(),
  timestamp: z.number(),
  accessCount: z.number().int().nonnegative(),
  lastAccessedAt: z.number(),
  decayFactor: z.number(),
  metadata: MemoryMetadataSchema,
});

export type MemoryEntry = z.infer<typeof MemoryEntrySchema>;

export const EpisodicEventTypeSchema = z.enum([
  "query",
  "response",
  "tool_call",
  "tool_result",
  "error",
]);

export type EpisodicEventType = z.infer<typeof EpisodicEventTypeSchema>;

export const EpisodicEntrySchema = MemoryEntrySchema.extend({
  type: z.literal("episodic"),
  eventType: EpisodicEventTypeSchema,
  conversationId: z.string().optional(),
  turnNumber: z.number().int().nonnegative().optional(),
  parentId: z.string().optional(),
});

export type EpisodicEntry = z.infer<typeof EpisodicEntrySchema>;

export const SemanticEntrySchema = MemoryEntrySchema.extend({
  type: z.literal("semantic"),
  category: z.string(),
  confidence: z.number().min(0).max(1),
  sources: z.array(z.string()),
  validUntil: z.number().optional(),
});

export type SemanticEntry = z.infer<typeof SemanticEntrySchema>;

export const ProceduralEntrySchema = MemoryEntrySchema.extend({
  type: z.literal("procedural"),
  pattern: z.string(),
  trigger: z.string(),
  action: z.string(),
  successRate: z.number().min(0).max(1),
  executionCount: z.number().int().nonnegative(),
});

export type ProceduralEntry = z.infer<typeof ProceduralEntrySchema>;

export const MemoryTimeRangeSchema = z.object({
  start: z.number().optional(),
  end: z.number().optional(),
});

export type MemoryTimeRange = z.infer<typeof MemoryTimeRangeSchema>;

export const MemoryQuerySchema = z.object({
  query: z.string(),
  teamId: z.string(),
  userId: z.string().optional(),
  sessionId: z.string().optional(),
  types: z.array(MemoryTypeSchema).optional(),
  limit: z.number().int().positive().optional(),
  minRelevance: z.number().min(0).max(1).optional(),
  timeRange: MemoryTimeRangeSchema.optional(),
  tags: z.array(z.string()).optional(),
});

export type MemoryQuery = z.infer<typeof MemoryQuerySchema>;

export const ScoredMemoryEntrySchema = z.object({
  entry: MemoryEntrySchema,
  relevanceScore: z.number(),
  recencyScore: z.number(),
  importanceScore: z.number(),
  combinedScore: z.number(),
});

export type ScoredMemoryEntry = z.infer<typeof ScoredMemoryEntrySchema>;

export const MemoryRetrievalResultSchema = z.object({
  entries: z.array(ScoredMemoryEntrySchema),
  totalCount: z.number().int().nonnegative(),
  queryTime: z.number().nonnegative(),
});

export type MemoryRetrievalResult = z.infer<typeof MemoryRetrievalResultSchema>;

export const ConsolidatedMemorySchema = z.object({
  episodic: z.string(),
  semantic: z.string(),
  procedural: z.string(),
  combined: z.string(),
  tokenCount: z.number().int().nonnegative(),
  entryCount: z.number().int().nonnegative(),
});

export type ConsolidatedMemory = z.infer<typeof ConsolidatedMemorySchema>;

export const MemoryStoreOptionsSchema = z.object({
  maxEntries: z.number().int().positive().optional(),
  decayRate: z.number().min(0).max(1).optional(),
  consolidationThreshold: z.number().min(0).max(1).optional(),
  embeddingEnabled: z.boolean().optional(),
});

export type MemoryStoreOptions = z.infer<typeof MemoryStoreOptionsSchema>;

export const MemoryConsolidatorOptionsSchema = z.object({
  maxTokens: z.number().int().positive().optional(),
  episodicWeight: z.number().min(0).max(1).optional(),
  semanticWeight: z.number().min(0).max(1).optional(),
  proceduralWeight: z.number().min(0).max(1).optional(),
  recencyBias: z.number().min(0).max(1).optional(),
  importanceBias: z.number().min(0).max(1).optional(),
});

export type MemoryConsolidatorOptions = z.infer<
  typeof MemoryConsolidatorOptionsSchema
>;
