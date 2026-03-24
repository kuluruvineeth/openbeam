import { z } from "zod";

export const CanvaSyncCursorSchema = z.object({
  lastSyncTime: z.number().optional(),
  lastFullSync: z.number().optional(),
  forceFullSync: z.boolean().optional(),
  designContinuation: z.string().optional(),
  folderContinuation: z.string().optional(),
});

export type CanvaSyncCursor = z.infer<typeof CanvaSyncCursorSchema>;

export const CanvaTransformContextSchema = z.object({
  connectorId: z.string(),
  connectorType: z.string(),
  teamId: z.string(),
  workspaceId: z.string(),
});

export type CanvaTransformContext = z.infer<typeof CanvaTransformContextSchema>;

export interface CanvaSyncBatch<T> {
  items: T[];
  cursor: CanvaSyncCursor;
  hasMore: boolean;
  stats: { processed: number; skipped: number; errors: number };
}
