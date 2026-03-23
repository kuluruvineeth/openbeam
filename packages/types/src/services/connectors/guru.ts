import { z } from "zod";

export const GURU_API_BASE = "https://api.getguru.com/api/v1";

export const GURU_RATE_LIMIT = 120;

export const GuruSyncCursorSchema = z.object({
  lastSyncTime: z.number().optional(),
  lastCardModifiedAt: z.string().optional(),
});

export type GuruSyncCursor = z.infer<typeof GuruSyncCursorSchema>;

export interface GuruSyncOptions {
  cursor?: GuruSyncCursor;
  batchSize?: number;
  forceFullSync?: boolean;
  syncCollections?: boolean;
  syncFolders?: boolean;
  lookbackDays?: number;
  includeCollections?: string[];
  excludeCollections?: string[];
  verifiedOnly?: boolean;
  onStageChange?: (
    stage: string,
    current: number,
    item?: string
  ) => Promise<void>;
}

export const GuruSyncBatchStatsSchema = z.object({
  processed: z.number(),
  skipped: z.number(),
  errors: z.number(),
});

export interface GuruSyncBatch<T> {
  items: T[];
  cursor: GuruSyncCursor;
  hasMore: boolean;
  stats: z.infer<typeof GuruSyncBatchStatsSchema>;
}

export interface GuruTransformContext {
  connectorId: string;
  connectorType: string;
  teamId: string;
  workspaceId: string;
}

export const GuruClientConfigSchema = z.object({
  connectorId: z.string(),
  email: z.string(),
  apiToken: z.string(),
  timeout: z.number().optional(),
});

export type GuruClientConfig = z.infer<typeof GuruClientConfigSchema>;
