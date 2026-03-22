import { z } from "zod";

export const IntercomSyncCursorSchema = z.object({
  lastSyncTime: z.number().optional(),
  conversationUpdatedAfter: z.number().optional(),
  articlePageToken: z.string().optional(),
  lastFullSync: z.number().optional(),
});

export type IntercomSyncCursor = z.infer<typeof IntercomSyncCursorSchema>;

export const IntercomSyncOptionsSchema = z.object({
  cursor: IntercomSyncCursorSchema.optional(),
  batchSize: z.number().optional().default(50),
  syncConversations: z.boolean().optional().default(true),
  syncArticles: z.boolean().optional().default(true),
  syncCollections: z.boolean().optional().default(true),
  syncContacts: z.boolean().optional().default(false),
  lookbackDays: z.number().optional(),
  stateFilter: z.string().optional(),
  tagsFilter: z.array(z.string()).optional(),
});

export type IntercomSyncOptions = z.infer<typeof IntercomSyncOptionsSchema>;

export const IntercomTransformContextSchema = z.object({
  connectorId: z.string(),
  connectorType: z.string(),
  teamId: z.string(),
  workspaceId: z.string(),
  appId: z.string().optional(),
});

export type IntercomTransformContext = z.infer<
  typeof IntercomTransformContextSchema
>;

export interface IntercomSyncBatch<T> {
  items: T[];
  cursor: IntercomSyncCursor;
  hasMore: boolean;
  stats: { processed: number; skipped: number; errors: number };
}
