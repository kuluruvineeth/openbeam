import { z } from "zod";

export const ProcoreSyncCursorSchema = z.object({
  lastSyncTime: z.number().optional(),
  lastFullSync: z.number().optional(),
  forceFullSync: z.boolean().optional(),
});

export type ProcoreSyncCursor = z.infer<typeof ProcoreSyncCursorSchema>;

export const ProcoreTransformContextSchema = z.object({
  connectorId: z.string(),
  connectorType: z.string(),
  teamId: z.string(),
  workspaceId: z.string(),
  companyId: z.string(),
});

export type ProcoreTransformContext = z.infer<
  typeof ProcoreTransformContextSchema
>;

export interface ProcoreSyncBatch<T> {
  items: T[];
  cursor: ProcoreSyncCursor;
  hasMore: boolean;
  stats: { processed: number; skipped: number; errors: number };
}
