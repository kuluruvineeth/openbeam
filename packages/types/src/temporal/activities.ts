import { z } from "zod";
import { SyncCursorSchema } from "./workflows";

export const FetchBatchInputSchema = z.object({
  connectorId: z.string(),
  connectorType: z.string(),
  cursor: SyncCursorSchema.optional(),
  batchSize: z.number(),
});

export type FetchBatchInput = z.infer<typeof FetchBatchInputSchema>;

export const FetchBatchOutputSchema = z.object({
  items: z.array(z.unknown()),
  nextCursor: SyncCursorSchema.optional(),
  hasMore: z.boolean(),
  rateLimitRemaining: z.number().optional(),
});

export type FetchBatchOutput = z.infer<typeof FetchBatchOutputSchema>;

export const UpdateSyncProgressInputSchema = z.object({
  connectorId: z.string(),
  processed: z.number(),
  cursor: SyncCursorSchema.optional(),
});

export type UpdateSyncProgressInput = z.infer<
  typeof UpdateSyncProgressInputSchema
>;

export const CompleteSyncJobInputSchema = z.object({
  connectorId: z.string(),
  processed: z.number(),
  indexed: z.number(),
  cursor: SyncCursorSchema.optional(),
});

export type CompleteSyncJobInput = z.infer<typeof CompleteSyncJobInputSchema>;

export const ParseDocumentInputSchema = z.object({
  path: z.string(),
  mimeType: z.string(),
});

export type ParseDocumentInput = z.infer<typeof ParseDocumentInputSchema>;

export const ParseDocumentOutputSchema = z.object({
  documentId: z.string(),
  content: z.string(),
  metadata: z.record(z.string(), z.unknown()),
});

export type ParseDocumentOutput = z.infer<typeof ParseDocumentOutputSchema>;

export const ChunkOutputSchema = z.object({
  content: z.string(),
  metadata: z.record(z.string(), z.unknown()),
});

export type ChunkOutput = z.infer<typeof ChunkOutputSchema>;

export const ActivityEmbeddedChunkSchema = ChunkOutputSchema.extend({
  embedding: z.array(z.number()),
});

export type ActivityEmbeddedChunk = z.infer<typeof ActivityEmbeddedChunkSchema>;

export const BulkIndexOutputSchema = z.object({
  indexed: z.number(),
  errors: z.number(),
});

export type BulkIndexOutput = z.infer<typeof BulkIndexOutputSchema>;

export const ActivityMediaSegmentSchema = z.object({
  start: z.number(),
  end: z.number(),
  transcription: z.string(),
  scenes: z.array(z.string()),
});

export type ActivityMediaSegment = z.infer<typeof ActivityMediaSegmentSchema>;

export const ProcessMediaOutputSchema = z.object({
  segments: z.array(ActivityMediaSegmentSchema),
  duration: z.number(),
});

export type ProcessMediaOutput = z.infer<typeof ProcessMediaOutputSchema>;

export const ProcessWebhookEventOutputSchema = z.object({
  action: z.enum(["sync_document", "delete_document", "ignore"]),
  documentIds: z.array(z.string()),
});

export type ProcessWebhookEventOutput = z.infer<
  typeof ProcessWebhookEventOutputSchema
>;

export const ExecuteAgentStepOutputSchema = z.object({
  artifacts: z.array(z.unknown()),
  checkpoint: z.object({
    step: z.number(),
    state: z.record(z.string(), z.unknown()),
    timestamp: z.number(),
  }),
  complete: z.boolean(),
});

export type ExecuteAgentStepOutput = z.infer<
  typeof ExecuteAgentStepOutputSchema
>;
