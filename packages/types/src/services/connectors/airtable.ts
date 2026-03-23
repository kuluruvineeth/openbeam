import { z } from "zod";

export const AirtableSyncCursorSchema = z.object({
  lastSyncTime: z.number().optional(),
  lastFullSync: z.number().optional(),
  forceFullSync: z.boolean().optional(),
  baseOffsets: z.record(z.string(), z.string()).optional(),
});

export type AirtableSyncCursor = z.infer<typeof AirtableSyncCursorSchema>;

export const AirtableTransformContextSchema = z.object({
  connectorId: z.string(),
  connectorType: z.string(),
  teamId: z.string(),
  workspaceId: z.string(),
});

export type AirtableTransformContext = z.infer<
  typeof AirtableTransformContextSchema
>;

export interface AirtableSyncBatch<T> {
  items: T[];
  cursor: AirtableSyncCursor;
  hasMore: boolean;
  stats: { processed: number; skipped: number; errors: number };
}
