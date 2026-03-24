import { z } from "zod";

export const EgnyteSyncCursorSchema = z.object({
  eventCursor: z.string().optional(),
  lastFullSync: z.number().optional(),
  forceFullSync: z.boolean().optional(),
  lastSyncTime: z.number().optional(),
});

export type EgnyteSyncCursor = z.infer<typeof EgnyteSyncCursorSchema>;

export const EgnyteSyncOptionsSchema = z.object({
  cursor: EgnyteSyncCursorSchema.optional(),
  batchSize: z.number().optional().default(100),
});

export type EgnyteSyncOptions = z.infer<typeof EgnyteSyncOptionsSchema>;

export const EgnyteTransformContextSchema = z.object({
  connectorId: z.string(),
  connectorType: z.string(),
  teamId: z.string(),
  workspaceId: z.string(),
  domain: z.string(),
});

export type EgnyteTransformContext = z.infer<
  typeof EgnyteTransformContextSchema
>;

export interface EgnyteSyncBatch<T> {
  items: T[];
  cursor: EgnyteSyncCursor;
  hasMore: boolean;
  stats: { processed: number; skipped: number; errors: number };
}
