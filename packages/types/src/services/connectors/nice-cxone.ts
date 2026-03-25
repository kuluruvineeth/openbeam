import { z } from "zod";

export const NiceCxoneSyncCursorSchema = z.object({
  lastSyncTime: z.number().optional(),
  lastFullSync: z.number().optional(),
  forceFullSync: z.boolean().optional(),
});

export type NiceCxoneSyncCursor = z.infer<typeof NiceCxoneSyncCursorSchema>;

export const NiceCxoneTransformContextSchema = z.object({
  connectorId: z.string(),
  connectorType: z.string(),
  teamId: z.string(),
  workspaceId: z.string(),
  baseUrl: z.string(),
});

export type NiceCxoneTransformContext = z.infer<
  typeof NiceCxoneTransformContextSchema
>;

export interface NiceCxoneSyncBatch<T> {
  items: T[];
  cursor: NiceCxoneSyncCursor;
  hasMore: boolean;
  stats: { processed: number; skipped: number; errors: number };
}

export const NiceCxoneClientConfigSchema = z.object({
  connectorId: z.string(),
  accessToken: z.string(),
  baseUrl: z.string(),
  timeout: z.number().optional(),
});

export type NiceCxoneClientConfig = z.infer<typeof NiceCxoneClientConfigSchema>;
