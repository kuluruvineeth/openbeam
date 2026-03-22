import { z } from "zod";

export const MONDAY_API_URL = "https://api.monday.com/v2";

export const MondaySyncCursorSchema = z.object({
  lastSyncTime: z.number().optional(),
  syncedBoardIds: z.array(z.string()).optional(),
  forceFullSync: z.boolean().optional(),
});

export type MondaySyncCursor = z.infer<typeof MondaySyncCursorSchema>;

export interface MondayTransformContext {
  connectorId: string;
  connectorType: string;
  teamId: string;
  workspaceId: string;
  accountSlug?: string;
}

export interface MondaySyncBatch<T> {
  items: T[];
  cursor: MondaySyncCursor;
  hasMore: boolean;
  stats: {
    processed: number;
    skipped: number;
    errors: number;
  };
}

export interface MondaySyncOptions {
  batchSize?: number;
  syncUpdates?: boolean;
  syncSubitems?: boolean;
  lookbackDays?: number;
  boardKindsFilter?: string[];
  includeBoardIds?: string[];
  excludeBoardIds?: string[];
  onStageChange?: (
    stage: string,
    processed: number,
    detail?: string
  ) => Promise<void> | void;
}

export interface MondayClientConfig {
  connectorId: string;
  accessToken?: string;
  rateLimitConfig?: {
    requestsPerMinute: number;
    requestsPerHour: number;
    burstLimit: number;
  };
  timeout?: number;
  debug?: boolean;
}

export interface MondayRateLimitState {
  remaining: number;
  resetAt: number;
  retryAfter?: number;
}

export const MondayUserSchema = z.object({
  id: z.number(),
  name: z.string(),
  email: z.string(),
  photo_thumb_small: z.string().nullable().optional(),
  enabled: z.boolean().optional(),
});

export type MondayUser = z.infer<typeof MondayUserSchema>;

export const MondayColumnValueSchema = z.object({
  id: z.string(),
  title: z.string().optional(),
  text: z.string().nullable(),
  type: z.string(),
  value: z.string().nullable().optional(),
});

export type MondayColumnValue = z.infer<typeof MondayColumnValueSchema>;

export const MondayGroupSchema = z.object({
  id: z.string(),
  title: z.string(),
  color: z.string().optional(),
  position: z.string().optional(),
});

export type MondayGroup = z.infer<typeof MondayGroupSchema>;

export const MondayColumnSchema = z.object({
  id: z.string(),
  title: z.string(),
  type: z.string(),
  settings_str: z.string().optional(),
});

export type MondayColumn = z.infer<typeof MondayColumnSchema>;

export const MondayBoardSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  state: z.string(),
  board_kind: z.string(),
  updated_at: z.string().nullable(),
  workspace_id: z.number().nullable().optional(),
  url: z.string(),
  columns: z.array(MondayColumnSchema).optional(),
  groups: z.array(MondayGroupSchema).optional(),
  owners: z.array(MondayUserSchema).optional(),
  creator: MondayUserSchema.nullable().optional(),
});

export type MondayBoard = z.infer<typeof MondayBoardSchema>;

export const MondayUpdateSchema = z.object({
  id: z.string(),
  body: z.string(),
  text_body: z.string().nullable().optional(),
  created_at: z.string(),
  updated_at: z.string().nullable().optional(),
  creator: MondayUserSchema.nullable().optional(),
});

export type MondayUpdate = z.infer<typeof MondayUpdateSchema>;

export const MondayItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  state: z.string().optional(),
  created_at: z.string(),
  updated_at: z.string().nullable(),
  url: z.string().optional(),
  group: MondayGroupSchema.nullable().optional(),
  column_values: z.array(MondayColumnValueSchema).optional(),
  creator: MondayUserSchema.nullable().optional(),
  updates: z.array(MondayUpdateSchema).optional(),
  board: z.object({ id: z.string(), name: z.string() }).nullable().optional(),
  subitems: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
      })
    )
    .optional(),
});

export type MondayItem = z.infer<typeof MondayItemSchema>;

export const MondayWorkspaceSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().nullable().optional(),
  kind: z.string().optional(),
});

export type MondayWorkspace = z.infer<typeof MondayWorkspaceSchema>;
