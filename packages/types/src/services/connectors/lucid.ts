import { z } from "zod";

export const LucidSyncCursorSchema = z.object({
  lastSyncTime: z.number().optional(),
  lastFullSync: z.number().optional(),
  forceFullSync: z.boolean().optional(),
});

export type LucidSyncCursor = z.infer<typeof LucidSyncCursorSchema>;

export const LucidTransformContextSchema = z.object({
  connectorId: z.string(),
  connectorType: z.string(),
  teamId: z.string(),
  workspaceId: z.string(),
  accountId: z.string(),
});

export type LucidTransformContext = z.infer<typeof LucidTransformContextSchema>;

export interface LucidSyncBatch<T> {
  items: T[];
  cursor: LucidSyncCursor;
  hasMore: boolean;
  stats: { processed: number; skipped: number; errors: number };
}
