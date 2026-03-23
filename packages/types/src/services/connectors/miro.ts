import { z } from "zod";

export const MiroSyncCursorSchema = z.object({
  lastSyncTime: z.number().optional(),
  lastFullSync: z.number().optional(),
  forceFullSync: z.boolean().optional(),
});

export type MiroSyncCursor = z.infer<typeof MiroSyncCursorSchema>;

export const MiroTransformContextSchema = z.object({
  connectorId: z.string(),
  connectorType: z.string(),
  teamId: z.string(),
  workspaceId: z.string(),
});

export type MiroTransformContext = z.infer<typeof MiroTransformContextSchema>;

export interface MiroSyncBatch<T> {
  items: T[];
  cursor: MiroSyncCursor;
  hasMore: boolean;
  stats: { processed: number; skipped: number; errors: number };
}
