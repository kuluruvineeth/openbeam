import { z } from "zod";

export const JFROG_RATE_LIMIT = 5000;

export const JFrogSyncCursorSchema = z.object({
  lastSyncTime: z.number().optional(),
  lastArtifactModified: z.string().optional(),
  lastBuildTimestamp: z.number().optional(),
});

export type JFrogSyncCursor = z.infer<typeof JFrogSyncCursorSchema>;

export interface JFrogSyncOptions {
  cursor?: JFrogSyncCursor;
  batchSize?: number;
  forceFullSync?: boolean;
  syncBuilds?: boolean;
  syncViolations?: boolean;
  onStageChange?: (
    stage: string,
    current: number,
    item?: string
  ) => Promise<void>;
}

export const JFrogSyncBatchStatsSchema = z.object({
  processed: z.number(),
  skipped: z.number(),
  errors: z.number(),
});

export interface JFrogSyncBatch<T> {
  items: T[];
  cursor: JFrogSyncCursor;
  hasMore: boolean;
  stats: z.infer<typeof JFrogSyncBatchStatsSchema>;
}

export interface JFrogTransformContext {
  connectorId: string;
  connectorType: string;
  teamId: string;
  workspaceId: string;
  instanceUrl: string;
}

export const JFrogClientConfigSchema = z.object({
  connectorId: z.string(),
  accessToken: z.string(),
  instanceUrl: z.string(),
  timeout: z.number().optional(),
});

export type JFrogClientConfig = z.infer<typeof JFrogClientConfigSchema>;
