import { z } from "zod";

export const LESSONLY_RATE_LIMIT_PER_MINUTE = 500;

export const LessonlySyncCursorSchema = z.object({
  lastSyncTime: z.number().optional(),
  lastFullSync: z.number().optional(),
  forceFullSync: z.boolean().optional(),
});

export type LessonlySyncCursor = z.infer<typeof LessonlySyncCursorSchema>;

export const LessonlyTransformContextSchema = z.object({
  connectorId: z.string(),
  connectorType: z.string(),
  teamId: z.string(),
  workspaceId: z.string(),
  subdomain: z.string(),
});

export type LessonlyTransformContext = z.infer<
  typeof LessonlyTransformContextSchema
>;

export interface LessonlySyncBatch<T> {
  items: T[];
  cursor: LessonlySyncCursor;
  hasMore: boolean;
  stats: { processed: number; skipped: number; errors: number };
}

export interface LessonlySyncOptions {
  cursor?: LessonlySyncCursor;
  batchSize?: number;
  lookbackDays?: number;
  onStageChange?: (
    stage: string,
    current: number,
    item?: string
  ) => Promise<void>;
}

export const LessonlyClientConfigSchema = z.object({
  connectorId: z.string(),
  apiKey: z.string(),
  subdomain: z.string(),
  timeout: z.number().optional(),
});

export type LessonlyClientConfig = z.infer<typeof LessonlyClientConfigSchema>;
