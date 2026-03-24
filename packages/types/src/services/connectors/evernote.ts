import { z } from "zod";

export const EVERNOTE_API_BASE = "https://api.evernote.com";
export const EVERNOTE_SANDBOX_API_BASE = "https://sandbox.evernote.com";

export const EVERNOTE_RATE_LIMIT_PER_HOUR = 200;

export const EvernoteSyncCursorSchema = z.object({
  lastSyncTime: z.number().optional(),
  lastFullSync: z.number().optional(),
  lastUpdateCount: z.number().optional(),
  forceFullSync: z.boolean().optional(),
});

export type EvernoteSyncCursor = z.infer<typeof EvernoteSyncCursorSchema>;

export interface EvernoteSyncOptions {
  cursor?: EvernoteSyncCursor;
  batchSize?: number;
  forceFullSync?: boolean;
  syncTags?: boolean;
  lookbackDays?: number;
  notebookFilter?: string;
  onStageChange?: (
    stage: string,
    current: number,
    item?: string
  ) => Promise<void>;
}

export const EvernoteSyncBatchStatsSchema = z.object({
  processed: z.number(),
  skipped: z.number(),
  errors: z.number(),
});

export interface EvernoteSyncBatch<T> {
  items: T[];
  cursor: EvernoteSyncCursor;
  hasMore: boolean;
  stats: z.infer<typeof EvernoteSyncBatchStatsSchema>;
}

export interface EvernoteTransformContext {
  connectorId: string;
  connectorType: string;
  teamId: string;
  workspaceId: string;
  environment?: "production" | "sandbox";
}

export const EvernoteClientConfigSchema = z.object({
  connectorId: z.string(),
  developerToken: z.string(),
  environment: z
    .enum(["production", "sandbox"])
    .optional()
    .default("production"),
  timeout: z.number().optional(),
});

export type EvernoteClientConfig = z.infer<typeof EvernoteClientConfigSchema>;
