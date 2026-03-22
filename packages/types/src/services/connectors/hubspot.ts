import { z } from "zod";

export const HubSpotSyncCursorSchema = z.object({
  lastSyncTime: z.number().optional(),
  lastFullSync: z.number().optional(),
  contactsAfter: z.string().optional(),
  dealsAfter: z.string().optional(),
  ticketsAfter: z.string().optional(),
  companiesAfter: z.string().optional(),
});

export type HubSpotSyncCursor = z.infer<typeof HubSpotSyncCursorSchema>;

export const HubSpotSyncOptionsSchema = z.object({
  cursor: HubSpotSyncCursorSchema.optional(),
  batchSize: z.number().optional().default(100),
  lookbackDays: z.number().optional(),
});

export type HubSpotSyncOptions = z.infer<typeof HubSpotSyncOptionsSchema>;

export const HubSpotTransformContextSchema = z.object({
  connectorId: z.string(),
  connectorType: z.string(),
  teamId: z.string(),
  workspaceId: z.string(),
  portalId: z.string(),
});

export type HubSpotTransformContext = z.infer<
  typeof HubSpotTransformContextSchema
>;

export interface HubSpotSyncBatch<T> {
  items: T[];
  cursor: HubSpotSyncCursor;
  hasMore: boolean;
  stats: { processed: number; skipped: number; errors: number };
}
