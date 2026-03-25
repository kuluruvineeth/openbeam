import { z } from "zod";

export const LOOPIO_RATE_LIMIT_PER_MINUTE = 100;

export const LoopioSyncCursorSchema = z.object({
  lastSyncTime: z.number().optional(),
  lastFullSync: z.number().optional(),
  forceFullSync: z.boolean().optional(),
});

export type LoopioSyncCursor = z.infer<typeof LoopioSyncCursorSchema>;

export const LoopioTransformContextSchema = z.object({
  connectorId: z.string(),
  connectorType: z.string(),
  teamId: z.string(),
  workspaceId: z.string(),
});

export type LoopioTransformContext = z.infer<
  typeof LoopioTransformContextSchema
>;

export interface LoopioSyncBatch<T> {
  items: T[];
  cursor: LoopioSyncCursor;
  hasMore: boolean;
  stats: { processed: number; skipped: number; errors: number };
}

export interface LoopioSyncOptions {
  cursor?: LoopioSyncCursor;
  batchSize?: number;
  lookbackDays?: number;
  onStageChange?: (
    stage: string,
    current: number,
    item?: string
  ) => Promise<void>;
}

export const LoopioClientConfigSchema = z.object({
  connectorId: z.string(),
  apiKey: z.string(),
  timeout: z.number().optional(),
});

export type LoopioClientConfig = z.infer<typeof LoopioClientConfigSchema>;
