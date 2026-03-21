import { z } from "zod";

export const BoxSyncCursorSchema = z.object({
  streamPosition: z.string().optional(),
  lastFullSync: z.number().optional(),
});

export type BoxSyncCursor = z.infer<typeof BoxSyncCursorSchema>;

export const BoxSyncOptionsSchema = z.object({
  cursor: BoxSyncCursorSchema.optional(),
  batchSize: z.number().optional().default(100),
});

export type BoxSyncOptions = z.infer<typeof BoxSyncOptionsSchema>;

export const BoxTransformContextSchema = z.object({
  connectorId: z.string(),
  connectorType: z.string(),
  teamId: z.string(),
  workspaceId: z.string(),
  enterpriseId: z.string(),
});

export type BoxTransformContext = z.infer<typeof BoxTransformContextSchema>;

export interface BoxSyncBatch<T> {
  items: T[];
  cursor: BoxSyncCursor;
  hasMore: boolean;
  stats: { processed: number; skipped: number; errors: number };
}
