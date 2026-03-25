import { z } from "zod";

export const HAYSTACK_RATE_LIMIT_PER_MINUTE = 100;

export const HaystackSyncCursorSchema = z.object({
  lastSyncTime: z.number().optional(),
  lastFullSync: z.number().optional(),
  forceFullSync: z.boolean().optional(),
});

export type HaystackSyncCursor = z.infer<typeof HaystackSyncCursorSchema>;

export const HaystackTransformContextSchema = z.object({
  connectorId: z.string(),
  connectorType: z.string(),
  teamId: z.string(),
  workspaceId: z.string(),
});

export type HaystackTransformContext = z.infer<
  typeof HaystackTransformContextSchema
>;

export interface HaystackSyncBatch<T> {
  items: T[];
  cursor: HaystackSyncCursor;
  hasMore: boolean;
  stats: { processed: number; skipped: number; errors: number };
}

export interface HaystackSyncOptions {
  cursor?: HaystackSyncCursor;
  batchSize?: number;
  syncTeams?: boolean;
  syncDepartments?: boolean;
  syncLocations?: boolean;
  lookbackDays?: number;
  onStageChange?: (
    stage: string,
    current: number,
    item?: string
  ) => Promise<void>;
}

export const HaystackClientConfigSchema = z.object({
  connectorId: z.string(),
  apiKey: z.string(),
  timeout: z.number().optional(),
});

export type HaystackClientConfig = z.infer<typeof HaystackClientConfigSchema>;
