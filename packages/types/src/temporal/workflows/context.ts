import { z } from "zod";

export const ContextEnrichmentInputSchema = z.object({
  uri: z.string(),
  teamId: z.string(),
  content: z.string(),
  contextType: z.string(),
});

export type ContextEnrichmentInput = z.infer<
  typeof ContextEnrichmentInputSchema
>;

export const MemoryExtractionInputSchema = z.object({
  sessionId: z.string(),
  teamId: z.string(),
  userId: z.string(),
  agentId: z.string().nullable().optional(),
});

export type MemoryExtractionInput = z.infer<typeof MemoryExtractionInputSchema>;

export const GenerateL0InputSchema = z.object({
  uri: z.string(),
  content: z.string(),
  contextType: z.string(),
});

export type GenerateL0Input = z.infer<typeof GenerateL0InputSchema>;

export const GenerateL1InputSchema = z.object({
  uri: z.string(),
  content: z.string(),
  childAbstracts: z.array(z.string()).optional(),
  contextType: z.string(),
});

export type GenerateL1Input = z.infer<typeof GenerateL1InputSchema>;

export const EmbedContextInputSchema = z.object({
  uri: z.string(),
  teamId: z.string(),
  abstractText: z.string(),
  overview: z.string().nullable().optional(),
});

export type EmbedContextInput = z.infer<typeof EmbedContextInputSchema>;

export const ExtractMemoriesInputSchema = z.object({
  sessionId: z.string(),
  teamId: z.string(),
  userId: z.string(),
  agentId: z.string().nullable().optional(),
});

export type ExtractMemoriesInput = z.infer<typeof ExtractMemoriesInputSchema>;

export const IngestSyncBatchInputSchema = z.object({
  teamId: z.string(),
  connectorId: z.string(),
  connectorType: z.string(),
  documentIds: z.array(z.string()),
});
export type IngestSyncBatchInput = z.infer<typeof IngestSyncBatchInputSchema>;

export const BatchEnrichmentInputSchema = z.object({
  teamId: z.string(),
  uris: z.array(z.string()),
});
export type BatchEnrichmentInput = z.infer<typeof BatchEnrichmentInputSchema>;

export const TeamKnowledgeSyncInputSchema = z.object({
  teamId: z.string(),
});
export type TeamKnowledgeSyncInput = z.infer<
  typeof TeamKnowledgeSyncInputSchema
>;

export const ExtractRelationsInputSchema = z.object({
  teamId: z.string(),
  connectorId: z.string(),
  documentIds: z.array(z.string()),
});
export type ExtractRelationsInput = z.infer<typeof ExtractRelationsInputSchema>;
