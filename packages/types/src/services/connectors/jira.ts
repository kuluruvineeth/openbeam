import { z } from "zod";

export const JiraSyncCursorSchema = z.object({
  lastSyncTime: z.string().optional(),
  nextPageToken: z.string().optional(),
  lastFullSync: z.number().optional(),
});

export type JiraSyncCursor = z.infer<typeof JiraSyncCursorSchema>;

export const JiraSyncOptionsSchema = z.object({
  cursor: JiraSyncCursorSchema.optional(),
  batchSize: z.number().optional().default(50),
  lookbackDays: z.number().optional(),
});

export type JiraSyncOptions = z.infer<typeof JiraSyncOptionsSchema>;

export const JiraTransformContextSchema = z.object({
  connectorId: z.string(),
  connectorType: z.string(),
  teamId: z.string(),
  workspaceId: z.string(),
  siteUrl: z.string(),
  cloudId: z.string(),
});

export type JiraTransformContext = z.infer<typeof JiraTransformContextSchema>;

export interface JiraSyncBatch<T> {
  items: T[];
  cursor: JiraSyncCursor;
  hasMore: boolean;
  stats: { processed: number; skipped: number; errors: number };
}
