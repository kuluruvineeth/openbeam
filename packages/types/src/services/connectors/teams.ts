import { z } from "zod";

export const TeamsSyncCursorSchema = z.object({
  channelDeltaLinks: z.record(z.string(), z.string()).optional(),
  teamIds: z.array(z.string()).optional(),
  channelMeta: z
    .record(
      z.string(),
      z.object({
        teamName: z.string(),
        channelName: z.string(),
      })
    )
    .optional(),
  lastFullSync: z.number().optional(),
});

export type TeamsSyncCursor = z.infer<typeof TeamsSyncCursorSchema>;

export const TeamsSyncOptionsSchema = z.object({
  cursor: TeamsSyncCursorSchema.optional(),
  batchSize: z.number().optional().default(100),
});

export type TeamsSyncOptions = z.infer<typeof TeamsSyncOptionsSchema>;

export const TeamsTransformContextSchema = z.object({
  connectorId: z.string(),
  connectorType: z.string(),
  teamId: z.string(),
  workspaceId: z.string(),
  userEmail: z.string(),
});

export type TeamsTransformContext = z.infer<typeof TeamsTransformContextSchema>;

export interface TeamsSyncBatch<T> {
  items: T[];
  cursor: TeamsSyncCursor;
  hasMore: boolean;
  stats: { processed: number; skipped: number; errors: number };
}
