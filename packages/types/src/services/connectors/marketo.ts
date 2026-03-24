import { z } from "zod";

export const MarketoSyncCursorSchema = z.object({
  lastSyncTime: z.number().optional(),
  lastFullSync: z.number().optional(),
  forceFullSync: z.boolean().optional(),
  lastActivityCreatedAt: z.string().optional(),
  nextPageToken: z.string().optional(),
});

export type MarketoSyncCursor = z.infer<typeof MarketoSyncCursorSchema>;

export const MarketoTransformContextSchema = z.object({
  connectorId: z.string(),
  connectorType: z.string(),
  teamId: z.string(),
  workspaceId: z.string(),
  munchkinId: z.string(),
});

export type MarketoTransformContext = z.infer<
  typeof MarketoTransformContextSchema
>;

export interface MarketoSyncBatch<T> {
  items: T[];
  cursor: MarketoSyncCursor;
  hasMore: boolean;
  stats: { processed: number; skipped: number; errors: number };
}

export const MarketoClientConfigSchema = z.object({
  connectorId: z.string(),
  accessToken: z.string(),
  munchkinId: z.string(),
  timeout: z.number().optional(),
});

export type MarketoClientConfig = z.infer<typeof MarketoClientConfigSchema>;
