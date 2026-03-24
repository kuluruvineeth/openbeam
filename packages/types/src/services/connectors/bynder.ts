import { z } from "zod";

export const BynderSyncCursorSchema = z.object({
  lastSyncTime: z.number().optional(),
  lastFullSync: z.number().optional(),
  forceFullSync: z.boolean().optional(),
  lastPage: z.number().optional(),
});

export type BynderSyncCursor = z.infer<typeof BynderSyncCursorSchema>;

export const BynderTransformContextSchema = z.object({
  connectorId: z.string(),
  connectorType: z.string(),
  teamId: z.string(),
  workspaceId: z.string(),
  domain: z.string(),
});

export type BynderTransformContext = z.infer<
  typeof BynderTransformContextSchema
>;

export interface BynderSyncBatch<T> {
  items: T[];
  cursor: BynderSyncCursor;
  hasMore: boolean;
  stats: { processed: number; skipped: number; errors: number };
}
