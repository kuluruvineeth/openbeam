import { z } from "zod";

export const GoogleChatSyncCursorSchema = z.object({
  lastSyncTime: z.number().optional(),
  lastFullSync: z.number().optional(),
  spacePageToken: z.string().optional(),
  forceFullSync: z.boolean().optional(),
});

export type GoogleChatSyncCursor = z.infer<typeof GoogleChatSyncCursorSchema>;

export const GoogleChatTransformContextSchema = z.object({
  connectorId: z.string(),
  connectorType: z.string(),
  teamId: z.string(),
  workspaceId: z.string(),
  userEmail: z.string(),
});

export type GoogleChatTransformContext = z.infer<
  typeof GoogleChatTransformContextSchema
>;

export interface GoogleChatSyncBatch<T> {
  items: T[];
  cursor: GoogleChatSyncCursor;
  hasMore: boolean;
  stats: { processed: number; skipped: number; errors: number };
}
