import { z } from "zod";

export const AsanaSyncCursorSchema = z.object({
  lastSyncTime: z.string().optional(),
  lastFullSync: z.number().optional(),
  forceFullSync: z.boolean().optional(),
});

export type AsanaSyncCursor = z.infer<typeof AsanaSyncCursorSchema>;

export const AsanaSyncOptionsSchema = z.object({
  cursor: AsanaSyncCursorSchema.optional(),
  batchSize: z.number().optional().default(50),
  lookbackDays: z.number().optional(),
});

export type AsanaSyncOptions = z.infer<typeof AsanaSyncOptionsSchema>;

export const AsanaTransformContextSchema = z.object({
  connectorId: z.string(),
  connectorType: z.string(),
  teamId: z.string(),
  workspaceId: z.string(),
  workspaceGid: z.string(),
});

export type AsanaTransformContext = z.infer<typeof AsanaTransformContextSchema>;

export interface AsanaSyncBatch<T> {
  items: T[];
  cursor: AsanaSyncCursor;
  hasMore: boolean;
  stats: { processed: number; skipped: number; errors: number };
}
