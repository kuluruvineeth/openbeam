import { z } from "zod";

export const SeismicSyncCursorSchema = z.object({
  lastSyncTime: z.number().optional(),
  lastFullSync: z.number().optional(),
  forceFullSync: z.boolean().optional(),
});

export type SeismicSyncCursor = z.infer<typeof SeismicSyncCursorSchema>;

export const SeismicTransformContextSchema = z.object({
  connectorId: z.string(),
  connectorType: z.string(),
  teamId: z.string(),
  workspaceId: z.string(),
});

export type SeismicTransformContext = z.infer<
  typeof SeismicTransformContextSchema
>;

export interface SeismicSyncBatch<T> {
  items: T[];
  cursor: SeismicSyncCursor;
  hasMore: boolean;
  stats: { processed: number; skipped: number; errors: number };
}
