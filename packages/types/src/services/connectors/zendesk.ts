import { z } from "zod";

export const ZendeskSyncCursorSchema = z.object({
  lastSyncTime: z.number().optional(),
  ticketCursor: z.string().optional(),
  articleUpdatedAfter: z.string().optional(),
  lastFullSync: z.number().optional(),
});

export type ZendeskSyncCursor = z.infer<typeof ZendeskSyncCursorSchema>;

export const ZendeskSyncOptionsSchema = z.object({
  cursor: ZendeskSyncCursorSchema.optional(),
  batchSize: z.number().optional().default(100),
  syncComments: z.boolean().optional().default(false),
  syncArticles: z.boolean().optional().default(true),
  lookbackDays: z.number().optional(),
  tagsFilter: z.array(z.string()).optional(),
  excludeClosedDays: z.number().optional(),
});

export type ZendeskSyncOptions = z.infer<typeof ZendeskSyncOptionsSchema>;

export const ZendeskTransformContextSchema = z.object({
  connectorId: z.string(),
  connectorType: z.string(),
  teamId: z.string(),
  workspaceId: z.string(),
  subdomain: z.string(),
});

export type ZendeskTransformContext = z.infer<
  typeof ZendeskTransformContextSchema
>;

export interface ZendeskSyncBatch<T> {
  items: T[];
  cursor: ZendeskSyncCursor;
  hasMore: boolean;
  stats: { processed: number; skipped: number; errors: number };
}
