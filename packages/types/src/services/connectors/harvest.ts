import { z } from "zod";

export const HarvestSyncCursorSchema = z.object({
  lastSyncTime: z.number().optional(),
  lastFullSync: z.number().optional(),
  forceFullSync: z.boolean().optional(),
});

export type HarvestSyncCursor = z.infer<typeof HarvestSyncCursorSchema>;

export const HarvestTransformContextSchema = z.object({
  connectorId: z.string(),
  connectorType: z.string(),
  teamId: z.string(),
  workspaceId: z.string(),
  accountId: z.string(),
  baseUrl: z.string(),
});

export type HarvestTransformContext = z.infer<
  typeof HarvestTransformContextSchema
>;

export interface HarvestSyncBatch<T> {
  items: T[];
  cursor: HarvestSyncCursor;
  hasMore: boolean;
  stats: { processed: number; skipped: number; errors: number };
}
