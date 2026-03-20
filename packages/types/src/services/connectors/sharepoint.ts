import { z } from "zod";

export const SharePointSyncCursorSchema = z.object({
  deltaLinks: z.record(z.string(), z.string()).optional(),
  siteIds: z.array(z.string()).optional(),
  lastFullSync: z.number().optional(),
});

export type SharePointSyncCursor = z.infer<typeof SharePointSyncCursorSchema>;

export const SharePointSyncOptionsSchema = z.object({
  cursor: SharePointSyncCursorSchema.optional(),
  batchSize: z.number().optional().default(100),
});

export type SharePointSyncOptions = z.infer<typeof SharePointSyncOptionsSchema>;

export const SharePointTransformContextSchema = z.object({
  connectorId: z.string(),
  connectorType: z.string(),
  teamId: z.string(),
  workspaceId: z.string(),
  userEmail: z.string(),
});

export type SharePointTransformContext = z.infer<
  typeof SharePointTransformContextSchema
>;

export interface SharePointSyncBatch<T> {
  items: T[];
  cursor: SharePointSyncCursor;
  hasMore: boolean;
  stats: { processed: number; skipped: number; errors: number };
}
