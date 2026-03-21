import { z } from "zod";

export const DropboxSyncCursorSchema = z.object({
  cursor: z.string().optional(),
  lastFullSync: z.number().optional(),
});

export type DropboxSyncCursor = z.infer<typeof DropboxSyncCursorSchema>;

export const DropboxSyncOptionsSchema = z.object({
  cursor: DropboxSyncCursorSchema.optional(),
  batchSize: z.number().optional().default(100),
});

export type DropboxSyncOptions = z.infer<typeof DropboxSyncOptionsSchema>;

export const DropboxTransformContextSchema = z.object({
  connectorId: z.string(),
  connectorType: z.string(),
  teamId: z.string(),
  workspaceId: z.string(),
  accountId: z.string(),
});

export type DropboxTransformContext = z.infer<
  typeof DropboxTransformContextSchema
>;

export interface DropboxSyncBatch<T> {
  items: T[];
  cursor: DropboxSyncCursor;
  hasMore: boolean;
  stats: { processed: number; skipped: number; errors: number };
}
