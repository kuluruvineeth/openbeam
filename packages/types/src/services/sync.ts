import { z } from "zod";

export const ServiceCreateSyncHistoryInputSchema = z.object({
  connectorId: z.string(),
  type: z.enum(["FULL", "INCREMENTAL"]),
});

export type ServiceCreateSyncHistoryInput = z.infer<
  typeof ServiceCreateSyncHistoryInputSchema
>;

export const CreateSyncHistoryResultSchema = z.object({
  syncHistoryId: z.string(),
  syncJobId: z.string(),
});

export type CreateSyncHistoryResult = z.infer<
  typeof CreateSyncHistoryResultSchema
>;

export const UpdateSyncCompletionInputSchema = z.object({
  connectorId: z.string(),
  syncHistoryId: z.string(),
  nextCursor: z.string().optional(),
  documentCount: z.number(),
  batchCount: z.number(),
  startTime: z.number(),
  filesQueued: z.number().optional(),
  mediaQueued: z.number().optional(),
});

export type UpdateSyncCompletionInput = z.infer<
  typeof UpdateSyncCompletionInputSchema
>;

export const HandleSyncErrorInputSchema = z.object({
  connectorId: z.string(),
  syncHistoryId: z.string(),
  error: z.unknown(),
});

export type HandleSyncErrorInput = z.infer<typeof HandleSyncErrorInputSchema>;

export const GetSyncCursorResultSchema = z.object({
  cursor: z.string().optional(),
  lastSyncedAt: z.date().nullable(),
});

export type GetSyncCursorResult = z.infer<typeof GetSyncCursorResultSchema>;

export const SyncBatchStatsSchema = z.object({
  processed: z.number(),
  skipped: z.number(),
  errors: z.number(),
});

export type SyncBatchStats = z.infer<typeof SyncBatchStatsSchema>;
