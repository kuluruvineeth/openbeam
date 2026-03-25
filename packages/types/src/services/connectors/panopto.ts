import { z } from "zod";

export const PanoptoSyncCursorSchema = z.object({
  lastSyncTime: z.number().optional(),
  lastFullSync: z.number().optional(),
  forceFullSync: z.boolean().optional(),
});

export type PanoptoSyncCursor = z.infer<typeof PanoptoSyncCursorSchema>;

export const PanoptoTransformContextSchema = z.object({
  connectorId: z.string(),
  connectorType: z.string(),
  teamId: z.string(),
  workspaceId: z.string(),
  instanceUrl: z.string(),
});

export type PanoptoTransformContext = z.infer<
  typeof PanoptoTransformContextSchema
>;

export interface PanoptoSyncBatch<T> {
  items: T[];
  cursor: PanoptoSyncCursor;
  hasMore: boolean;
  stats: { processed: number; skipped: number; errors: number };
}
