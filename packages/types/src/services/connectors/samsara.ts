import { z } from "zod";

export const SAMSARA_API_BASE_US = "https://api.samsara.com";
export const SAMSARA_API_BASE_EU = "https://api.eu.samsara.com";

export const SamsaraSyncCursorSchema = z.object({
  lastSyncTime: z.number().optional(),
  vehicleFeedCursor: z.string().optional(),
  locationFeedCursor: z.string().optional(),
  alertsCursor: z.string().optional(),
  driversCursor: z.string().optional(),
  sensorsCursor: z.string().optional(),
});

export type SamsaraSyncCursor = z.infer<typeof SamsaraSyncCursorSchema>;

export interface SamsaraSyncOptions {
  cursor?: SamsaraSyncCursor;
  batchSize?: number;
  forceFullSync?: boolean;
  syncAlerts?: boolean;
  syncSensors?: boolean;
  lookbackDays?: number;
  onStageChange?: (
    stage: string,
    current: number,
    item?: string
  ) => Promise<void>;
}

export const SamsaraSyncBatchStatsSchema = z.object({
  processed: z.number(),
  skipped: z.number(),
  errors: z.number(),
});

export interface SamsaraSyncBatch<T> {
  items: T[];
  cursor: SamsaraSyncCursor;
  hasMore: boolean;
  stats: z.infer<typeof SamsaraSyncBatchStatsSchema>;
}

export interface SamsaraTransformContext {
  connectorId: string;
  connectorType: string;
  teamId: string;
  workspaceId: string;
  organizationId?: string;
  organizationName?: string;
  region: "us" | "eu";
}

export const SamsaraClientConfigSchema = z.object({
  connectorId: z.string(),
  apiToken: z.string(),
  region: z.enum(["us", "eu"]).default("us"),
  apiVersion: z.string().default("2024-06-01"),
  timeout: z.number().optional(),
});

export type SamsaraClientConfig = z.infer<typeof SamsaraClientConfigSchema>;

export const SamsaraPaginationSchema = z.object({
  endCursor: z.string(),
  hasNextPage: z.boolean(),
});

export type SamsaraPagination = z.infer<typeof SamsaraPaginationSchema>;
