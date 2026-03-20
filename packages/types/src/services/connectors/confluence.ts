import { z } from "zod";

export const ConfluenceSyncCursorSchema = z.object({
  lastSyncTime: z.string().optional(),
  pageToken: z.string().optional(),
  lastFullSync: z.number().optional(),
});

export type ConfluenceSyncCursor = z.infer<typeof ConfluenceSyncCursorSchema>;

export const ConfluenceSyncOptionsSchema = z.object({
  cursor: ConfluenceSyncCursorSchema.optional(),
  batchSize: z.number().optional().default(100),
  lookbackDays: z.number().optional(),
});

export type ConfluenceSyncOptions = z.infer<typeof ConfluenceSyncOptionsSchema>;

export const ConfluenceTransformContextSchema = z.object({
  connectorId: z.string(),
  connectorType: z.string(),
  teamId: z.string(),
  workspaceId: z.string(),
  siteUrl: z.string(),
  cloudId: z.string(),
});

export type ConfluenceTransformContext = z.infer<
  typeof ConfluenceTransformContextSchema
>;

export interface ConfluenceSyncBatch<T> {
  items: T[];
  cursor: ConfluenceSyncCursor;
  hasMore: boolean;
  stats: { processed: number; skipped: number; errors: number };
}
