import { z } from "zod";

export const AMPLITUDE_API_BASE = "https://amplitude.com/api/3";
export const AMPLITUDE_ANALYTICS_API_BASE =
  "https://analytics.amplitude.com/api/3";

export const AMPLITUDE_RATE_LIMIT = 360;

export const AmplitudeSyncCursorSchema = z.object({
  lastSyncTime: z.number().optional(),
  lastChartModified: z.string().optional(),
  lastDashboardModified: z.string().optional(),
});

export type AmplitudeSyncCursor = z.infer<typeof AmplitudeSyncCursorSchema>;

export interface AmplitudeSyncOptions {
  cursor?: AmplitudeSyncCursor;
  batchSize?: number;
  forceFullSync?: boolean;
  syncCohorts?: boolean;
  lookbackDays?: number;
  onStageChange?: (
    stage: string,
    current: number,
    item?: string
  ) => Promise<void>;
}

export const AmplitudeSyncBatchStatsSchema = z.object({
  processed: z.number(),
  skipped: z.number(),
  errors: z.number(),
});

export interface AmplitudeSyncBatch<T> {
  items: T[];
  cursor: AmplitudeSyncCursor;
  hasMore: boolean;
  stats: z.infer<typeof AmplitudeSyncBatchStatsSchema>;
}

export interface AmplitudeTransformContext {
  connectorId: string;
  connectorType: string;
  teamId: string;
  workspaceId: string;
  orgSlug?: string;
}

export const AmplitudeClientConfigSchema = z.object({
  connectorId: z.string(),
  apiKey: z.string(),
  secretKey: z.string(),
  orgSlug: z.string().optional(),
  timeout: z.number().optional(),
});

export type AmplitudeClientConfig = z.infer<typeof AmplitudeClientConfigSchema>;
