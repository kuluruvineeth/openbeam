import { z } from "zod";

export const PAGERDUTY_API_BASE = "https://api.pagerduty.com";

export const PAGERDUTY_RATE_LIMIT = 960;

export const PagerDutySyncCursorSchema = z.object({
  lastSyncTime: z.number().optional(),
  lastIncidentUpdatedAt: z.string().optional(),
});

export type PagerDutySyncCursor = z.infer<typeof PagerDutySyncCursorSchema>;

export interface PagerDutySyncOptions {
  cursor?: PagerDutySyncCursor;
  batchSize?: number;
  forceFullSync?: boolean;
  syncServices?: boolean;
  syncSchedules?: boolean;
  lookbackDays?: number;
  urgencyFilter?: string;
  statusFilter?: string;
  serviceIdsFilter?: string[];
  onStageChange?: (
    stage: string,
    current: number,
    item?: string
  ) => Promise<void>;
}

export const PagerDutySyncBatchStatsSchema = z.object({
  processed: z.number(),
  skipped: z.number(),
  errors: z.number(),
});

export interface PagerDutySyncBatch<T> {
  items: T[];
  cursor: PagerDutySyncCursor;
  hasMore: boolean;
  stats: z.infer<typeof PagerDutySyncBatchStatsSchema>;
}

export interface PagerDutyTransformContext {
  connectorId: string;
  connectorType: string;
  teamId: string;
  workspaceId: string;
  subdomain?: string;
}

export const PagerDutyClientConfigSchema = z.object({
  connectorId: z.string(),
  apiKey: z.string(),
  timeout: z.number().optional(),
});

export type PagerDutyClientConfig = z.infer<typeof PagerDutyClientConfigSchema>;
