import { z } from "zod";

export const DoceboSyncCursorSchema = z.object({
  lastSyncTime: z.number().optional(),
  lastFullSync: z.number().optional(),
  forceFullSync: z.boolean().optional(),
});

export type DoceboSyncCursor = z.infer<typeof DoceboSyncCursorSchema>;

export const DoceboTransformContextSchema = z.object({
  connectorId: z.string(),
  connectorType: z.string(),
  teamId: z.string(),
  workspaceId: z.string(),
  instanceUrl: z.string(),
});

export type DoceboTransformContext = z.infer<
  typeof DoceboTransformContextSchema
>;

export interface DoceboSyncBatch<T> {
  items: T[];
  cursor: DoceboSyncCursor;
  hasMore: boolean;
  stats: { processed: number; skipped: number; errors: number };
}

export const DoceboClientConfigSchema = z.object({
  connectorId: z.string(),
  accessToken: z.string(),
  instanceUrl: z.string(),
  timeout: z.number().optional(),
});

export type DoceboClientConfig = z.infer<typeof DoceboClientConfigSchema>;
