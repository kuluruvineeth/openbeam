import { z } from "zod";

export const PipedriveSyncCursorSchema = z.object({
  lastSyncTime: z.number().optional(),
  lastFullSync: z.number().optional(),
  forceFullSync: z.boolean().optional(),
});

export type PipedriveSyncCursor = z.infer<typeof PipedriveSyncCursorSchema>;

export const PipedriveTransformContextSchema = z.object({
  connectorId: z.string(),
  connectorType: z.string(),
  teamId: z.string(),
  workspaceId: z.string(),
  companyDomain: z.string(),
});

export type PipedriveTransformContext = z.infer<
  typeof PipedriveTransformContextSchema
>;

export interface PipedriveSyncBatch<T> {
  items: T[];
  cursor: PipedriveSyncCursor;
  hasMore: boolean;
  stats: { processed: number; skipped: number; errors: number };
}
