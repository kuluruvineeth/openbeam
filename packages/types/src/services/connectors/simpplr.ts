import { z } from "zod";

export const SIMPPLR_RATE_LIMIT_PER_MINUTE = 100;

export const SimpplrSyncCursorSchema = z.object({
  lastSyncTime: z.number().optional(),
  lastFullSync: z.number().optional(),
  forceFullSync: z.boolean().optional(),
});

export type SimpplrSyncCursor = z.infer<typeof SimpplrSyncCursorSchema>;

export const SimpplrTransformContextSchema = z.object({
  connectorId: z.string(),
  connectorType: z.string(),
  teamId: z.string(),
  workspaceId: z.string(),
  instanceUrl: z.string(),
});

export type SimpplrTransformContext = z.infer<
  typeof SimpplrTransformContextSchema
>;

export interface SimpplrSyncBatch<T> {
  items: T[];
  cursor: SimpplrSyncCursor;
  hasMore: boolean;
  stats: { processed: number; skipped: number; errors: number };
}

export interface SimpplrSyncOptions {
  cursor?: SimpplrSyncCursor;
  batchSize?: number;
  syncFiles?: boolean;
  syncPeople?: boolean;
  lookbackDays?: number;
  onStageChange?: (
    stage: string,
    current: number,
    item?: string
  ) => Promise<void>;
}

export const SimpplrClientConfigSchema = z.object({
  connectorId: z.string(),
  apiKey: z.string(),
  instance: z.string(),
  timeout: z.number().optional(),
});

export type SimpplrClientConfig = z.infer<typeof SimpplrClientConfigSchema>;
