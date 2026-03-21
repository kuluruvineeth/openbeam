import { z } from "zod";

export const MicrosoftCalendarSyncCursorSchema = z.object({
  deltaLink: z.string().optional(),
  lastFullSync: z.number().optional(),
});

export type MicrosoftCalendarSyncCursor = z.infer<
  typeof MicrosoftCalendarSyncCursorSchema
>;

export const MicrosoftCalendarTransformContextSchema = z.object({
  connectorId: z.string(),
  connectorType: z.string(),
  teamId: z.string(),
  workspaceId: z.string(),
  userEmail: z.string(),
});

export type MicrosoftCalendarTransformContext = z.infer<
  typeof MicrosoftCalendarTransformContextSchema
>;

export interface MicrosoftCalendarSyncBatch<T> {
  items: T[];
  cursor: MicrosoftCalendarSyncCursor;
  hasMore: boolean;
  stats: { processed: number; skipped: number; errors: number };
}
