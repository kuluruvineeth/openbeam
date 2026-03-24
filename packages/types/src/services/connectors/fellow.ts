import { z } from "zod";

export const FELLOW_RATE_LIMIT_PER_MINUTE = 100;

export const FellowSyncCursorSchema = z.object({
  lastSyncTime: z.number().optional(),
  lastFullSync: z.number().optional(),
  forceFullSync: z.boolean().optional(),
});

export type FellowSyncCursor = z.infer<typeof FellowSyncCursorSchema>;

export const FellowTransformContextSchema = z.object({
  connectorId: z.string(),
  connectorType: z.string(),
  teamId: z.string(),
  workspaceId: z.string(),
});

export type FellowTransformContext = z.infer<
  typeof FellowTransformContextSchema
>;

export interface FellowSyncBatch<T> {
  items: T[];
  cursor: FellowSyncCursor;
  hasMore: boolean;
  stats: { processed: number; skipped: number; errors: number };
}

export interface FellowSyncOptions {
  cursor?: FellowSyncCursor;
  batchSize?: number;
  lookbackDays?: number;
  onStageChange?: (
    stage: string,
    current: number,
    item?: string
  ) => Promise<void>;
}

export const FellowClientConfigSchema = z.object({
  connectorId: z.string(),
  apiKey: z.string(),
  timeout: z.number().optional(),
});

export type FellowClientConfig = z.infer<typeof FellowClientConfigSchema>;
