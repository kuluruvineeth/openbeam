import { z } from "zod";

export const OneNoteSyncCursorSchema = z.object({
  lastSyncTime: z.number().optional(),
  lastFullSync: z.number().optional(),
  forceFullSync: z.boolean().optional(),
});

export type OneNoteSyncCursor = z.infer<typeof OneNoteSyncCursorSchema>;

export const OneNoteSyncOptionsSchema = z.object({
  cursor: OneNoteSyncCursorSchema.optional(),
  batchSize: z.number().optional().default(50),
  lookbackDays: z.number().optional(),
  syncPageContent: z.boolean().optional().default(true),
  includeNotebooks: z.array(z.string()).optional(),
  excludeNotebooks: z.array(z.string()).optional(),
});

export type OneNoteSyncOptions = z.infer<typeof OneNoteSyncOptionsSchema>;

export const OneNoteTransformContextSchema = z.object({
  connectorId: z.string(),
  connectorType: z.string(),
  teamId: z.string(),
  workspaceId: z.string(),
  userEmail: z.string(),
});

export type OneNoteTransformContext = z.infer<
  typeof OneNoteTransformContextSchema
>;

export interface OneNoteSyncBatch<T> {
  items: T[];
  cursor: OneNoteSyncCursor;
  hasMore: boolean;
  stats: { processed: number; skipped: number; errors: number };
}
