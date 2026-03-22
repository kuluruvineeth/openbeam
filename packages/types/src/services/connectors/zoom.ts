import { z } from "zod";

export const ZOOM_API_BASE_URL = "https://api.zoom.us/v2";
export const ZOOM_AUTH_URL = "https://zoom.us/oauth/authorize";
export const ZOOM_TOKEN_URL = "https://zoom.us/oauth/token";

export const ZOOM_TOKEN_LIFETIME_SECONDS = 3600;

export const ZOOM_RATE_LIMITS = {
  light: { requestsPerSecond: 80 },
  medium: { requestsPerSecond: 60 },
  heavy: { requestsPerSecond: 40, requestsPerDay: 60_000 },
  resourceIntensive: { requestsPerSecond: 20 },
} as const;

export const ZoomUserSchema = z.object({
  id: z.string(),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  display_name: z.string().optional(),
  email: z.string(),
  type: z.number(),
  dept: z.string().optional(),
  timezone: z.string().optional(),
  pic_url: z.string().optional(),
  status: z.string().optional(),
});

export type ZoomUser = z.infer<typeof ZoomUserSchema>;

export const ZoomMeetingSchema = z.object({
  uuid: z.string(),
  id: z.number(),
  topic: z.string(),
  type: z.number(),
  start_time: z.string().optional(),
  duration: z.number().optional(),
  timezone: z.string().optional(),
  agenda: z.string().optional(),
  host_id: z.string(),
  total_minutes: z.number().optional(),
  participants_count: z.number().optional(),
  join_url: z.string().optional(),
  created_at: z.string().optional(),
});

export type ZoomMeeting = z.infer<typeof ZoomMeetingSchema>;

export const ZoomRecordingFileSchema = z.object({
  id: z.string().optional(),
  meeting_id: z.string(),
  recording_start: z.string().optional(),
  recording_end: z.string().optional(),
  file_type: z.string(),
  file_size: z.number().optional(),
  play_url: z.string().optional(),
  download_url: z.string().optional(),
  status: z.string().optional(),
  recording_type: z.string().optional(),
});

export type ZoomRecordingFile = z.infer<typeof ZoomRecordingFileSchema>;

export const ZoomRecordingSchema = z.object({
  uuid: z.string(),
  id: z.number(),
  account_id: z.string().optional(),
  host_id: z.string(),
  host_email: z.string().optional(),
  topic: z.string(),
  type: z.number().optional(),
  start_time: z.string().optional(),
  timezone: z.string().optional(),
  duration: z.number().optional(),
  total_size: z.number().optional(),
  share_url: z.string().optional(),
  recording_files: z.array(ZoomRecordingFileSchema).optional(),
});

export type ZoomRecording = z.infer<typeof ZoomRecordingSchema>;

export const ZoomPaginatedResponseSchema = z.object({
  page_count: z.number().optional(),
  page_number: z.number().optional(),
  page_size: z.number().optional(),
  total_records: z.number().optional(),
  next_page_token: z.string().optional(),
});

export const ZoomSyncCursorSchema = z.object({
  lastSyncTime: z.number().optional(),
  lastFullSync: z.number().optional(),
  meetingsPageToken: z.string().optional(),
  recordingsFromDate: z.string().optional(),
});

export type ZoomSyncCursor = z.infer<typeof ZoomSyncCursorSchema>;

export const ZoomSyncOptionsSchema = z.object({
  cursor: ZoomSyncCursorSchema.optional(),
  batchSize: z.number().optional().default(50),
  syncRecordings: z.boolean().optional().default(true),
  syncTranscripts: z.boolean().optional().default(true),
  syncPastMeetings: z.boolean().optional().default(true),
  lookbackDays: z.number().optional().default(90),
  includeUsers: z.array(z.string()).optional(),
  excludeUsers: z.array(z.string()).optional(),
  recordingTypesFilter: z.array(z.string()).optional(),
  forceFullSync: z.boolean().optional(),
});

export type ZoomSyncOptions = z.infer<typeof ZoomSyncOptionsSchema>;

export const ZoomTransformContextSchema = z.object({
  connectorId: z.string(),
  connectorType: z.string(),
  teamId: z.string(),
  workspaceId: z.string(),
  accountId: z.string().optional(),
});

export type ZoomTransformContext = z.infer<typeof ZoomTransformContextSchema>;

export interface ZoomSyncBatch<T> {
  items: T[];
  cursor: ZoomSyncCursor;
  hasMore: boolean;
  stats: { processed: number; skipped: number; errors: number };
}
