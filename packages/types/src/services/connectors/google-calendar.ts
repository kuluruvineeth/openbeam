import { z } from "zod";

export const GoogleCalendarSyncCursorSchema = z.object({
  syncToken: z.string().optional(),
  pageToken: z.string().optional(),
  lastFullSync: z.number().optional(),
});

export type GoogleCalendarSyncCursor = z.infer<
  typeof GoogleCalendarSyncCursorSchema
>;

export const GoogleCalendarTransformContextSchema = z.object({
  connectorId: z.string(),
  connectorType: z.string(),
  teamId: z.string(),
  workspaceId: z.string(),
  userEmail: z.string(),
});

export type GoogleCalendarTransformContext = z.infer<
  typeof GoogleCalendarTransformContextSchema
>;

export interface GoogleCalendarSyncBatch<T> {
  items: T[];
  cursor: GoogleCalendarSyncCursor;
  hasMore: boolean;
  stats: { processed: number; skipped: number; errors: number };
}
