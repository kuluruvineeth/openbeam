import { z } from "zod";

export const FRESHSERVICE_RATE_LIMIT = 200;

export const FRESHSERVICE_DEFAULT_LOOKBACK_DAYS = 90;

export const FreshserviceSyncCursorSchema = z.object({
  lastSyncTime: z.number().optional(),
  lastTicketUpdatedAt: z.string().optional(),
});

export type FreshserviceSyncCursor = z.infer<
  typeof FreshserviceSyncCursorSchema
>;

export interface FreshserviceSyncOptions {
  cursor?: FreshserviceSyncCursor;
  batchSize?: number;
  forceFullSync?: boolean;
  syncArticles?: boolean;
  syncChanges?: boolean;
  syncProblems?: boolean;
  lookbackDays?: number;
  statusFilter?: string;
  priorityFilter?: string;
  onStageChange?: (
    stage: string,
    current: number,
    item?: string
  ) => Promise<void>;
}

export const FreshserviceSyncBatchStatsSchema = z.object({
  processed: z.number(),
  skipped: z.number(),
  errors: z.number(),
});

export interface FreshserviceSyncBatch<T> {
  items: T[];
  cursor: FreshserviceSyncCursor;
  hasMore: boolean;
  stats: z.infer<typeof FreshserviceSyncBatchStatsSchema>;
}

export interface FreshserviceTransformContext {
  connectorId: string;
  connectorType: string;
  teamId: string;
  workspaceId: string;
  domain: string;
}

export const FreshserviceClientConfigSchema = z.object({
  connectorId: z.string(),
  apiKey: z.string(),
  domain: z.string(),
  timeout: z.number().optional(),
});

export type FreshserviceClientConfig = z.infer<
  typeof FreshserviceClientConfigSchema
>;
