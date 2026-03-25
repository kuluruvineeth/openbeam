import { z } from "zod";

export const MINDTICKLE_RATE_LIMIT_PER_MINUTE = 100;

export const MindtickleSyncCursorSchema = z.object({
  lastSyncTime: z.number().optional(),
  lastFullSync: z.number().optional(),
  forceFullSync: z.boolean().optional(),
});

export type MindtickleSyncCursor = z.infer<typeof MindtickleSyncCursorSchema>;

export const MindtickleTransformContextSchema = z.object({
  connectorId: z.string(),
  connectorType: z.string(),
  teamId: z.string(),
  workspaceId: z.string(),
});

export type MindtickleTransformContext = z.infer<
  typeof MindtickleTransformContextSchema
>;

export interface MindtickleSyncBatch<T> {
  items: T[];
  cursor: MindtickleSyncCursor;
  hasMore: boolean;
  stats: { processed: number; skipped: number; errors: number };
}

export interface MindtickleSyncOptions {
  cursor?: MindtickleSyncCursor;
  batchSize?: number;
  lookbackDays?: number;
  onStageChange?: (
    stage: string,
    current: number,
    item?: string
  ) => Promise<void>;
}

export const MindtickleClientConfigSchema = z.object({
  connectorId: z.string(),
  apiKey: z.string(),
  timeout: z.number().optional(),
});

export type MindtickleClientConfig = z.infer<
  typeof MindtickleClientConfigSchema
>;
