import { z } from "zod";

export const FIFTEEN_FIVE_RATE_LIMIT_PER_MINUTE = 100;

export const FifteenFiveSyncCursorSchema = z.object({
  lastSyncTime: z.number().optional(),
  lastFullSync: z.number().optional(),
  forceFullSync: z.boolean().optional(),
});

export type FifteenFiveSyncCursor = z.infer<typeof FifteenFiveSyncCursorSchema>;

export const FifteenFiveTransformContextSchema = z.object({
  connectorId: z.string(),
  connectorType: z.string(),
  teamId: z.string(),
  workspaceId: z.string(),
});

export type FifteenFiveTransformContext = z.infer<
  typeof FifteenFiveTransformContextSchema
>;

export interface FifteenFiveSyncBatch<T> {
  items: T[];
  cursor: FifteenFiveSyncCursor;
  hasMore: boolean;
  stats: { processed: number; skipped: number; errors: number };
}

export interface FifteenFiveSyncOptions {
  cursor?: FifteenFiveSyncCursor;
  batchSize?: number;
  syncReviews?: boolean;
  syncHighFives?: boolean;
  lookbackDays?: number;
  onStageChange?: (
    stage: string,
    current: number,
    item?: string
  ) => Promise<void>;
}

export const FifteenFiveClientConfigSchema = z.object({
  connectorId: z.string(),
  apiKey: z.string(),
  timeout: z.number().optional(),
});

export type FifteenFiveClientConfig = z.infer<
  typeof FifteenFiveClientConfigSchema
>;
