import { z } from "zod";

export const BENCHLING_RATE_LIMIT_PER_MINUTE = 1000;

export const BenchlingSyncCursorSchema = z.object({
  lastSyncTime: z.number().optional(),
  lastFullSync: z.number().optional(),
  forceFullSync: z.boolean().optional(),
});

export type BenchlingSyncCursor = z.infer<typeof BenchlingSyncCursorSchema>;

export const BenchlingTransformContextSchema = z.object({
  connectorId: z.string(),
  connectorType: z.string(),
  teamId: z.string(),
  workspaceId: z.string(),
  tenant: z.string(),
});

export type BenchlingTransformContext = z.infer<
  typeof BenchlingTransformContextSchema
>;

export interface BenchlingSyncBatch<T> {
  items: T[];
  cursor: BenchlingSyncCursor;
  hasMore: boolean;
  stats: { processed: number; skipped: number; errors: number };
}

export interface BenchlingSyncOptions {
  cursor?: BenchlingSyncCursor;
  batchSize?: number;
  syncSequences?: boolean;
  syncAssayResults?: boolean;
  lookbackDays?: number;
  onStageChange?: (
    stage: string,
    current: number,
    item?: string
  ) => Promise<void>;
}

export const BenchlingClientConfigSchema = z.object({
  connectorId: z.string(),
  apiKey: z.string(),
  tenant: z.string(),
  timeout: z.number().optional(),
});

export type BenchlingClientConfig = z.infer<typeof BenchlingClientConfigSchema>;
