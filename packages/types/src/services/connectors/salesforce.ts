import { z } from "zod";

export const SalesforceSyncCursorSchema = z.object({
  lastSyncTime: z.string().optional(),
  queryLocator: z.string().optional(),
  lastFullSync: z.number().optional(),
});

export type SalesforceSyncCursor = z.infer<typeof SalesforceSyncCursorSchema>;

export const SalesforceSyncOptionsSchema = z.object({
  cursor: SalesforceSyncCursorSchema.optional(),
  batchSize: z.number().optional().default(200),
  lookbackDays: z.number().optional(),
});

export type SalesforceSyncOptions = z.infer<typeof SalesforceSyncOptionsSchema>;

export const SalesforceTransformContextSchema = z.object({
  connectorId: z.string(),
  connectorType: z.string(),
  teamId: z.string(),
  workspaceId: z.string(),
  instanceUrl: z.string(),
});

export type SalesforceTransformContext = z.infer<
  typeof SalesforceTransformContextSchema
>;

export interface SalesforceSyncBatch<T> {
  items: T[];
  cursor: SalesforceSyncCursor;
  hasMore: boolean;
  stats: { processed: number; skipped: number; errors: number };
}
