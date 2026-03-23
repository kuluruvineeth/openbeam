import { z } from "zod";

export const DATADOG_SITES = {
  us1: "https://api.datadoghq.com",
  us3: "https://api.us3.datadoghq.com",
  us5: "https://api.us5.datadoghq.com",
  eu: "https://api.datadoghq.eu",
  ap1: "https://api.ap1.datadoghq.com",
  gov: "https://api.ddog-gov.com",
} as const;

export const DATADOG_APP_SITES = {
  us1: "https://app.datadoghq.com",
  us3: "https://us3.datadoghq.com",
  us5: "https://us5.datadoghq.com",
  eu: "https://app.datadoghq.eu",
  ap1: "https://ap1.datadoghq.com",
  gov: "https://app.ddog-gov.com",
} as const;

export type DatadogSite = keyof typeof DATADOG_SITES;

export const DATADOG_RATE_LIMIT = 300;

export const DatadogSyncCursorSchema = z.object({
  lastSyncTime: z.number().optional(),
  lastMonitorModified: z.number().optional(),
  lastDashboardModified: z.number().optional(),
});

export type DatadogSyncCursor = z.infer<typeof DatadogSyncCursorSchema>;

export interface DatadogSyncOptions {
  cursor?: DatadogSyncCursor;
  batchSize?: number;
  forceFullSync?: boolean;
  syncDashboards?: boolean;
  syncIncidents?: boolean;
  syncServices?: boolean;
  syncNotebooks?: boolean;
  syncSlos?: boolean;
  lookbackDays?: number;
  onStageChange?: (
    stage: string,
    current: number,
    item?: string
  ) => Promise<void>;
}

export const DatadogSyncBatchStatsSchema = z.object({
  processed: z.number(),
  skipped: z.number(),
  errors: z.number(),
});

export interface DatadogSyncBatch<T> {
  items: T[];
  cursor: DatadogSyncCursor;
  hasMore: boolean;
  stats: z.infer<typeof DatadogSyncBatchStatsSchema>;
}

export interface DatadogTransformContext {
  connectorId: string;
  connectorType: string;
  teamId: string;
  workspaceId: string;
  site: DatadogSite;
}

export const DatadogClientConfigSchema = z.object({
  connectorId: z.string(),
  apiKey: z.string(),
  appKey: z.string(),
  site: z
    .enum(["us1", "us3", "us5", "eu", "ap1", "gov"])
    .optional()
    .default("us1"),
  timeout: z.number().optional(),
});

export type DatadogClientConfig = z.infer<typeof DatadogClientConfigSchema>;
