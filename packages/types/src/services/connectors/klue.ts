import { z } from "zod";

export const KLUE_RATE_LIMIT_PER_MINUTE = 100;

export const KlueSyncCursorSchema = z.object({
  lastSyncTime: z.number().optional(),
  lastFullSync: z.number().optional(),
  forceFullSync: z.boolean().optional(),
});

export type KlueSyncCursor = z.infer<typeof KlueSyncCursorSchema>;

export const KlueTransformContextSchema = z.object({
  connectorId: z.string(),
  connectorType: z.string(),
  teamId: z.string(),
  workspaceId: z.string(),
});

export type KlueTransformContext = z.infer<typeof KlueTransformContextSchema>;

export interface KlueSyncBatch<T> {
  items: T[];
  cursor: KlueSyncCursor;
  hasMore: boolean;
  stats: { processed: number; skipped: number; errors: number };
}

export interface KlueSyncOptions {
  cursor?: KlueSyncCursor;
  batchSize?: number;
  syncBoards?: boolean;
  lookbackDays?: number;
  onStageChange?: (
    stage: string,
    current: number,
    item?: string
  ) => Promise<void>;
}

export const KlueClientConfigSchema = z.object({
  connectorId: z.string(),
  apiKey: z.string(),
  timeout: z.number().optional(),
});

export type KlueClientConfig = z.infer<typeof KlueClientConfigSchema>;
