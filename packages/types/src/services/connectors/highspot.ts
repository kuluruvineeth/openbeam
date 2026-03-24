import { z } from "zod";

export const HighspotSyncCursorSchema = z.object({
  lastSyncTime: z.number().optional(),
  lastFullSync: z.number().optional(),
  forceFullSync: z.boolean().optional(),
});

export type HighspotSyncCursor = z.infer<typeof HighspotSyncCursorSchema>;

export const HighspotTransformContextSchema = z.object({
  connectorId: z.string(),
  connectorType: z.string(),
  teamId: z.string(),
  workspaceId: z.string(),
  domain: z.string(),
});

export type HighspotTransformContext = z.infer<
  typeof HighspotTransformContextSchema
>;

export interface HighspotSyncBatch<T> {
  items: T[];
  cursor: HighspotSyncCursor;
  hasMore: boolean;
  stats: { processed: number; skipped: number; errors: number };
}
