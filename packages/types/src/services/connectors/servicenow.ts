import { z } from "zod";

export const ServiceNowSyncCursorSchema = z.object({
  lastSyncTime: z.number().optional(),
  lastFullSync: z.number().optional(),
});

export type ServiceNowSyncCursor = z.infer<typeof ServiceNowSyncCursorSchema>;

export const ServiceNowSyncOptionsSchema = z.object({
  cursor: ServiceNowSyncCursorSchema.optional(),
  batchSize: z.number().optional().default(100),
});

export type ServiceNowSyncOptions = z.infer<typeof ServiceNowSyncOptionsSchema>;

export const ServiceNowTransformContextSchema = z.object({
  connectorId: z.string(),
  connectorType: z.string(),
  teamId: z.string(),
  workspaceId: z.string(),
  instance: z.string(),
});

export type ServiceNowTransformContext = z.infer<
  typeof ServiceNowTransformContextSchema
>;

export interface ServiceNowSyncBatch<T> {
  items: T[];
  cursor: ServiceNowSyncCursor;
  hasMore: boolean;
  stats: { processed: number; skipped: number; errors: number };
}
