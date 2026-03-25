import { z } from "zod";

export const JENKINS_DEFAULT_TIMEOUT = 30_000;

export const JENKINS_RATE_LIMIT = 120;

export const JenkinsSyncCursorSchema = z.object({
  lastSyncTime: z.number().optional(),
  lastBuildNumbers: z.record(z.string(), z.number()).optional(),
});

export type JenkinsSyncCursor = z.infer<typeof JenkinsSyncCursorSchema>;

export interface JenkinsSyncOptions {
  cursor?: JenkinsSyncCursor;
  batchSize?: number;
  forceFullSync?: boolean;
  syncConsoleOutput?: boolean;
  maxBuildsPerJob?: number;
  lookbackDays?: number;
  onStageChange?: (
    stage: string,
    current: number,
    item?: string
  ) => Promise<void>;
}

export const JenkinsSyncBatchStatsSchema = z.object({
  processed: z.number(),
  skipped: z.number(),
  errors: z.number(),
});

export interface JenkinsSyncBatch<T> {
  items: T[];
  cursor: JenkinsSyncCursor;
  hasMore: boolean;
  stats: z.infer<typeof JenkinsSyncBatchStatsSchema>;
}

export interface JenkinsTransformContext {
  connectorId: string;
  connectorType: string;
  teamId: string;
  workspaceId: string;
  instanceUrl: string;
}

export const JenkinsClientConfigSchema = z.object({
  connectorId: z.string(),
  instanceUrl: z.string().url(),
  username: z.string(),
  apiToken: z.string(),
  timeout: z.number().optional(),
});

export type JenkinsClientConfig = z.infer<typeof JenkinsClientConfigSchema>;
