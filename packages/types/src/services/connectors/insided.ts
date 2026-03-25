import { z } from "zod";

export const INSIDED_RATE_LIMIT_PER_MINUTE = 100;

export const InsidedSyncCursorSchema = z.object({
  lastSyncTime: z.number().optional(),
  lastFullSync: z.number().optional(),
  forceFullSync: z.boolean().optional(),
});

export type InsidedSyncCursor = z.infer<typeof InsidedSyncCursorSchema>;

export const InsidedTransformContextSchema = z.object({
  connectorId: z.string(),
  connectorType: z.string(),
  teamId: z.string(),
  workspaceId: z.string(),
  communityUrl: z.string(),
});

export type InsidedTransformContext = z.infer<
  typeof InsidedTransformContextSchema
>;

export interface InsidedSyncBatch<T> {
  items: T[];
  cursor: InsidedSyncCursor;
  hasMore: boolean;
  stats: { processed: number; skipped: number; errors: number };
}

export interface InsidedSyncOptions {
  cursor?: InsidedSyncCursor;
  batchSize?: number;
  syncArticles?: boolean;
  syncIdeas?: boolean;
  lookbackDays?: number;
  onStageChange?: (
    stage: string,
    current: number,
    item?: string
  ) => Promise<void>;
}

export const InsidedClientConfigSchema = z.object({
  connectorId: z.string(),
  apiKey: z.string(),
  communityUrl: z.string(),
  timeout: z.number().optional(),
});

export type InsidedClientConfig = z.infer<typeof InsidedClientConfigSchema>;
