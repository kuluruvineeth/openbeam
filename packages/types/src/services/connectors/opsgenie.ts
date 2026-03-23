import { z } from "zod";

export const OPSGENIE_API_BASE_US = "https://api.opsgenie.com/v2";
export const OPSGENIE_API_BASE_EU = "https://api.eu.opsgenie.com/v2";

export const OPSGENIE_RATE_LIMIT = 4150;

export const OpsGenieSyncCursorSchema = z.object({
  lastSyncTime: z.number().optional(),
  lastAlertUpdatedAt: z.string().optional(),
  lastIncidentUpdatedAt: z.string().optional(),
});

export type OpsGenieSyncCursor = z.infer<typeof OpsGenieSyncCursorSchema>;

export interface OpsGenieSyncOptions {
  cursor?: OpsGenieSyncCursor;
  batchSize?: number;
  forceFullSync?: boolean;
  syncServices?: boolean;
  syncSchedules?: boolean;
  lookbackDays?: number;
  priorityFilter?: string;
  onStageChange?: (
    stage: string,
    current: number,
    item?: string
  ) => Promise<void>;
}

export const OpsGenieSyncBatchStatsSchema = z.object({
  processed: z.number(),
  skipped: z.number(),
  errors: z.number(),
});

export interface OpsGenieSyncBatch<T> {
  items: T[];
  cursor: OpsGenieSyncCursor;
  hasMore: boolean;
  stats: z.infer<typeof OpsGenieSyncBatchStatsSchema>;
}

export interface OpsGenieTransformContext {
  connectorId: string;
  connectorType: string;
  teamId: string;
  workspaceId: string;
  region?: "us" | "eu";
}

export const OpsGenieClientConfigSchema = z.object({
  connectorId: z.string(),
  apiKey: z.string(),
  region: z.enum(["us", "eu"]).optional().default("us"),
  timeout: z.number().optional(),
});

export type OpsGenieClientConfig = z.infer<typeof OpsGenieClientConfigSchema>;
