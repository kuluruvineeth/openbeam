import { z } from "zod";

export const OutlookSyncCursorSchema = z.object({
  deltaLink: z.string().optional(),
  lastFullSync: z.number().optional(),
});

export type OutlookSyncCursor = z.infer<typeof OutlookSyncCursorSchema>;

export const OutlookSyncOptionsSchema = z.object({
  cursor: OutlookSyncCursorSchema.optional(),
  batchSize: z.number().optional().default(100),
  lookbackDays: z.number().optional(),
});

export type OutlookSyncOptions = z.infer<typeof OutlookSyncOptionsSchema>;

export const OutlookTransformContextSchema = z.object({
  connectorId: z.string(),
  connectorType: z.string(),
  teamId: z.string(),
  workspaceId: z.string(),
  userEmail: z.string(),
});

export type OutlookTransformContext = z.infer<
  typeof OutlookTransformContextSchema
>;

export interface OutlookSyncBatch<T> {
  items: T[];
  cursor: OutlookSyncCursor;
  hasMore: boolean;
  stats: { processed: number; skipped: number; errors: number };
}
