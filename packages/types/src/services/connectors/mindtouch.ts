import { z } from "zod";

export const MINDTOUCH_RATE_LIMIT_PER_MINUTE = 120;

export const MindtouchSyncCursorSchema = z.object({
  lastSyncTime: z.number().optional(),
  lastFullSync: z.number().optional(),
  forceFullSync: z.boolean().optional(),
});

export type MindtouchSyncCursor = z.infer<typeof MindtouchSyncCursorSchema>;

export const MindtouchTransformContextSchema = z.object({
  connectorId: z.string(),
  connectorType: z.string(),
  teamId: z.string(),
  workspaceId: z.string(),
  instanceUrl: z.string(),
});

export type MindtouchTransformContext = z.infer<
  typeof MindtouchTransformContextSchema
>;

export interface MindtouchSyncBatch<T> {
  items: T[];
  cursor: MindtouchSyncCursor;
  hasMore: boolean;
  stats: { processed: number; skipped: number; errors: number };
}

export interface MindtouchSyncOptions {
  cursor?: MindtouchSyncCursor;
  batchSize?: number;
  lookbackDays?: number;
  onStageChange?: (
    stage: string,
    current: number,
    item?: string
  ) => Promise<void>;
}

export const MindtouchClientConfigSchema = z.object({
  connectorId: z.string(),
  apiToken: z.string(),
  instanceUrl: z.string(),
  timeout: z.number().optional(),
});

export type MindtouchClientConfig = z.infer<typeof MindtouchClientConfigSchema>;
