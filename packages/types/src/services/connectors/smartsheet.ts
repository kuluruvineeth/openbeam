import { z } from "zod";

export const SMARTSHEET_API_BASE = "https://api.smartsheet.com/2.0";
export const SMARTSHEET_RATE_LIMIT_PER_MINUTE = 300;

export const SmartsheetSyncCursorSchema = z.object({
  lastSyncTime: z.number().optional(),
  lastFullSync: z.number().optional(),
  forceFullSync: z.boolean().optional(),
});

export type SmartsheetSyncCursor = z.infer<typeof SmartsheetSyncCursorSchema>;

export const SmartsheetTransformContextSchema = z.object({
  connectorId: z.string(),
  connectorType: z.string(),
  teamId: z.string(),
  workspaceId: z.string(),
});

export type SmartsheetTransformContext = z.infer<
  typeof SmartsheetTransformContextSchema
>;

export interface SmartsheetSyncBatch<T> {
  items: T[];
  cursor: SmartsheetSyncCursor;
  hasMore: boolean;
  stats: { processed: number; skipped: number; errors: number };
}

export interface SmartsheetSyncOptions {
  cursor?: SmartsheetSyncCursor;
  batchSize?: number;
  syncReports?: boolean;
  syncDashboards?: boolean;
  syncWorkspaces?: boolean;
  lookbackDays?: number;
  onStageChange?: (
    stage: string,
    current: number,
    item?: string
  ) => Promise<void>;
}

export const SmartsheetClientConfigSchema = z.object({
  connectorId: z.string(),
  apiKey: z.string(),
  timeout: z.number().optional(),
});

export type SmartsheetClientConfig = z.infer<
  typeof SmartsheetClientConfigSchema
>;
