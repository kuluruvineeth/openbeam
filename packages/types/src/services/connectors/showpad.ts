import { z } from "zod";

export const ShowpadSyncCursorSchema = z.object({
  lastSyncTime: z.number().optional(),
  lastFullSync: z.number().optional(),
  forceFullSync: z.boolean().optional(),
  lastPage: z.number().optional(),
});

export type ShowpadSyncCursor = z.infer<typeof ShowpadSyncCursorSchema>;

export const ShowpadTransformContextSchema = z.object({
  connectorId: z.string(),
  connectorType: z.string(),
  teamId: z.string(),
  workspaceId: z.string(),
  subdomain: z.string(),
});

export type ShowpadTransformContext = z.infer<
  typeof ShowpadTransformContextSchema
>;

export interface ShowpadSyncBatch<T> {
  items: T[];
  cursor: ShowpadSyncCursor;
  hasMore: boolean;
  stats: { processed: number; skipped: number; errors: number };
}
