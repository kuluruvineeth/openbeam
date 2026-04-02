import { z } from "zod";

export const LUMAPPS_API_BASE = "https://api.lumapps.com/v2";

export const LUMAPPS_V1_API_SUFFIX = "/_ah/api/lumsites/v1";

export const LUMAPPS_RATE_LIMIT = 100;

export const LumAppsSyncCursorSchema = z.object({
  lastSyncTime: z.number().optional(),
  lastContentUpdatedAt: z.string().optional(),
  lastPostUpdatedAt: z.string().optional(),
});

export type LumAppsSyncCursor = z.infer<typeof LumAppsSyncCursorSchema>;

export interface LumAppsSyncOptions {
  cursor?: LumAppsSyncCursor;
  batchSize?: number;
  forceFullSync?: boolean;
  syncCommunities?: boolean;
  syncPosts?: boolean;
  onStageChange?: (
    stage: string,
    current: number,
    item?: string
  ) => Promise<void>;
}

export const LumAppsSyncBatchStatsSchema = z.object({
  processed: z.number(),
  skipped: z.number(),
  errors: z.number(),
});

export interface LumAppsSyncBatch<T> {
  items: T[];
  cursor: LumAppsSyncCursor;
  hasMore: boolean;
  stats: z.infer<typeof LumAppsSyncBatchStatsSchema>;
}

export interface LumAppsTransformContext {
  connectorId: string;
  connectorType: string;
  teamId: string;
  workspaceId: string;
  baseUrl?: string;
}

export const LumAppsClientConfigSchema = z.object({
  connectorId: z.string(),
  apiToken: z.string(),
  baseUrl: z.string().optional().default(LUMAPPS_API_BASE),
  cellUrl: z
    .string()
    .optional()
    .describe(
      "Cell-specific URL for v1 App Engine API (e.g. https://go-cell-001.api.lumapps.com)"
    ),
  customerId: z.string().optional().describe("LumApps customer ID"),
  instanceId: z.string().optional().describe("LumApps instance ID"),
  timeout: z.number().optional(),
});

export type LumAppsClientConfig = z.input<typeof LumAppsClientConfigSchema>;
