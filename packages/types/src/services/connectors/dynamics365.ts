import { z } from "zod";

export const Dynamics365SyncCursorSchema = z.object({
  lastSyncTime: z.number().optional(),
  lastFullSync: z.number().optional(),
  forceFullSync: z.boolean().optional(),
});

export type Dynamics365SyncCursor = z.infer<typeof Dynamics365SyncCursorSchema>;

export const Dynamics365TransformContextSchema = z.object({
  connectorId: z.string(),
  connectorType: z.string(),
  teamId: z.string(),
  workspaceId: z.string(),
  orgUrl: z.string(),
});

export type Dynamics365TransformContext = z.infer<
  typeof Dynamics365TransformContextSchema
>;

export interface Dynamics365SyncBatch<T> {
  items: T[];
  cursor: Dynamics365SyncCursor;
  hasMore: boolean;
  stats: { processed: number; skipped: number; errors: number };
}
