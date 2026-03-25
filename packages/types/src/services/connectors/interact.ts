import { z } from "zod";

export const INTERACT_RATE_LIMIT_PER_MINUTE = 200;

export const InteractSyncCursorSchema = z.object({
  lastSyncTime: z.number().optional(),
  lastFullSync: z.number().optional(),
  forceFullSync: z.boolean().optional(),
});

export type InteractSyncCursor = z.infer<typeof InteractSyncCursorSchema>;

export const InteractTransformContextSchema = z.object({
  connectorId: z.string(),
  connectorType: z.string(),
  teamId: z.string(),
  workspaceId: z.string(),
  instanceUrl: z.string(),
});

export type InteractTransformContext = z.infer<
  typeof InteractTransformContextSchema
>;

export interface InteractSyncBatch<T> {
  items: T[];
  cursor: InteractSyncCursor;
  hasMore: boolean;
  stats: { processed: number; skipped: number; errors: number };
}

export interface InteractSyncOptions {
  cursor?: InteractSyncCursor;
  batchSize?: number;
  syncDocuments?: boolean;
  syncPeople?: boolean;
  syncSpaces?: boolean;
  lookbackDays?: number;
  onStageChange?: (
    stage: string,
    current: number,
    item?: string
  ) => Promise<void>;
}

export const InteractClientConfigSchema = z.object({
  connectorId: z.string(),
  apiKey: z.string(),
  instance: z.string(),
  timeout: z.number().optional(),
});

export type InteractClientConfig = z.infer<typeof InteractClientConfigSchema>;
