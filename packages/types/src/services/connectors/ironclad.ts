import { z } from "zod";

export const IRONCLAD_RATE_LIMIT_PER_MINUTE = 100;

export const IroncladSyncCursorSchema = z.object({
  lastSyncTime: z.number().optional(),
  lastFullSync: z.number().optional(),
  forceFullSync: z.boolean().optional(),
});

export type IroncladSyncCursor = z.infer<typeof IroncladSyncCursorSchema>;

export const IroncladTransformContextSchema = z.object({
  connectorId: z.string(),
  connectorType: z.string(),
  teamId: z.string(),
  workspaceId: z.string(),
});

export type IroncladTransformContext = z.infer<
  typeof IroncladTransformContextSchema
>;

export interface IroncladSyncBatch<T> {
  items: T[];
  cursor: IroncladSyncCursor;
  hasMore: boolean;
  stats: { processed: number; skipped: number; errors: number };
}

export interface IroncladSyncOptions {
  cursor?: IroncladSyncCursor;
  batchSize?: number;
  lookbackDays?: number;
  onStageChange?: (
    stage: string,
    current: number,
    item?: string
  ) => Promise<void>;
}

export const IroncladClientConfigSchema = z.object({
  connectorId: z.string(),
  apiKey: z.string(),
  timeout: z.number().optional(),
});

export type IroncladClientConfig = z.infer<typeof IroncladClientConfigSchema>;
