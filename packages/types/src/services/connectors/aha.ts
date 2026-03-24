import { z } from "zod";

export const AHA_RATE_LIMIT_PER_MINUTE = 300;

export const AhaSyncCursorSchema = z.object({
  lastSyncTime: z.number().optional(),
  lastFullSync: z.number().optional(),
  forceFullSync: z.boolean().optional(),
});

export type AhaSyncCursor = z.infer<typeof AhaSyncCursorSchema>;

export const AhaTransformContextSchema = z.object({
  connectorId: z.string(),
  connectorType: z.string(),
  teamId: z.string(),
  workspaceId: z.string(),
  subdomain: z.string(),
});

export type AhaTransformContext = z.infer<typeof AhaTransformContextSchema>;

export interface AhaSyncBatch<T> {
  items: T[];
  cursor: AhaSyncCursor;
  hasMore: boolean;
  stats: { processed: number; skipped: number; errors: number };
}

export interface AhaSyncOptions {
  cursor?: AhaSyncCursor;
  batchSize?: number;
  syncEpics?: boolean;
  syncInitiatives?: boolean;
  lookbackDays?: number;
  productFilter?: string[];
  onStageChange?: (
    stage: string,
    current: number,
    item?: string
  ) => Promise<void>;
}

export const AhaClientConfigSchema = z.object({
  connectorId: z.string(),
  apiKey: z.string(),
  subdomain: z.string(),
  timeout: z.number().optional(),
});

export type AhaClientConfig = z.infer<typeof AhaClientConfigSchema>;
