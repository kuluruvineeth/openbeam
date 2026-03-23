import { z } from "zod";

export const DocuSignSyncCursorSchema = z.object({
  lastSyncTime: z.number().optional(),
  lastFullSync: z.number().optional(),
  forceFullSync: z.boolean().optional(),
});

export type DocuSignSyncCursor = z.infer<typeof DocuSignSyncCursorSchema>;

export const DocuSignTransformContextSchema = z.object({
  connectorId: z.string(),
  connectorType: z.string(),
  teamId: z.string(),
  workspaceId: z.string(),
  accountBaseUri: z.string(),
  accountId: z.string(),
});

export type DocuSignTransformContext = z.infer<
  typeof DocuSignTransformContextSchema
>;

export interface DocuSignSyncBatch<T> {
  items: T[];
  cursor: DocuSignSyncCursor;
  hasMore: boolean;
  stats: { processed: number; skipped: number; errors: number };
}
