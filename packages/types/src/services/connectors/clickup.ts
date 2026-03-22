import { z } from "zod";

export const CLICKUP_API_URL = "https://api.clickup.com/api/v2";

export const ClickUpMemberSchema = z.object({
  id: z.number(),
  username: z.string().nullable(),
  email: z.string().optional(),
  color: z.string().nullable(),
  profilePicture: z.string().nullable(),
  initials: z.string().nullable(),
});

export type ClickUpMember = z.infer<typeof ClickUpMemberSchema>;

export const ClickUpStatusSchema = z.object({
  id: z.string().optional(),
  status: z.string(),
  color: z.string(),
  type: z.string(),
  orderindex: z.number(),
});

export type ClickUpStatus = z.infer<typeof ClickUpStatusSchema>;

export const ClickUpPrioritySchema = z
  .object({
    id: z.string(),
    priority: z.string(),
    color: z.string(),
    orderindex: z.string(),
  })
  .nullable();

export type ClickUpPriority = z.infer<typeof ClickUpPrioritySchema>;

export const ClickUpTagSchema = z.object({
  name: z.string(),
  tag_fg: z.string(),
  tag_bg: z.string(),
});

export type ClickUpTag = z.infer<typeof ClickUpTagSchema>;

export const ClickUpCustomFieldSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string(),
  value: z.unknown().nullable(),
});

export type ClickUpCustomField = z.infer<typeof ClickUpCustomFieldSchema>;

export const ClickUpTaskSchema = z.object({
  id: z.string(),
  custom_id: z.string().nullable().optional(),
  name: z.string(),
  text_content: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  status: ClickUpStatusSchema,
  orderindex: z.string(),
  date_created: z.string(),
  date_updated: z.string(),
  date_closed: z.string().nullable().optional(),
  date_done: z.string().nullable().optional(),
  archived: z.boolean(),
  creator: ClickUpMemberSchema,
  assignees: z.array(ClickUpMemberSchema),
  tags: z.array(ClickUpTagSchema),
  parent: z.string().nullable().optional(),
  priority: ClickUpPrioritySchema.optional(),
  due_date: z.string().nullable().optional(),
  start_date: z.string().nullable().optional(),
  points: z.number().nullable().optional(),
  time_estimate: z.number().nullable().optional(),
  time_spent: z.number().nullable().optional(),
  custom_fields: z.array(ClickUpCustomFieldSchema).optional(),
  list: z.object({ id: z.string(), name: z.string().optional() }).optional(),
  folder: z.object({ id: z.string(), name: z.string().optional() }).optional(),
  space: z.object({ id: z.string() }).optional(),
  url: z.string(),
});

export type ClickUpTask = z.infer<typeof ClickUpTaskSchema>;

export const ClickUpCommentSchema = z.object({
  id: z.string(),
  comment_text: z.string(),
  user: ClickUpMemberSchema,
  date: z.string(),
});

export type ClickUpComment = z.infer<typeof ClickUpCommentSchema>;

export const ClickUpSpaceSchema = z.object({
  id: z.string(),
  name: z.string(),
  private: z.boolean(),
  archived: z.boolean(),
  statuses: z.array(ClickUpStatusSchema).optional(),
});

export type ClickUpSpace = z.infer<typeof ClickUpSpaceSchema>;

export const ClickUpFolderSchema = z.object({
  id: z.string(),
  name: z.string(),
  orderindex: z.number(),
  hidden: z.boolean(),
  space: z.object({ id: z.string() }),
  lists: z.array(z.lazy(() => ClickUpListSchema)).optional(),
});

export type ClickUpFolder = z.infer<typeof ClickUpFolderSchema>;

export const ClickUpListSchema = z.object({
  id: z.string(),
  name: z.string(),
  orderindex: z.number(),
  content: z.string().nullable().optional(),
  status: z
    .object({ status: z.string(), color: z.string() })
    .nullable()
    .optional(),
  archived: z.boolean(),
  space: z.object({ id: z.string() }).optional(),
  folder: z.object({ id: z.string(), name: z.string().optional() }).optional(),
  task_count: z.number().nullable().optional(),
});

export type ClickUpList = z.infer<typeof ClickUpListSchema>;

export const ClickUpSyncCursorSchema = z.object({
  lastSyncTime: z.number().optional(),
  lastPage: z.number().optional(),
  syncedSpaces: z.array(z.string()).optional(),
  forceFullSync: z.boolean().optional(),
});

export type ClickUpSyncCursor = z.infer<typeof ClickUpSyncCursorSchema>;

export interface ClickUpSyncOptions {
  cursor?: ClickUpSyncCursor;
  batchSize?: number;
  forceFullSync?: boolean;
  syncComments?: boolean;
  lookbackDays?: number;
  includeSpaces?: string[];
  excludeSpaces?: string[];
  onStageChange?: (
    stage: string,
    current: number,
    item?: string
  ) => Promise<void>;
}

export const ClickUpSyncBatchStatsSchema = z.object({
  processed: z.number(),
  skipped: z.number(),
  errors: z.number(),
});

export interface ClickUpSyncBatch<T> {
  items: T[];
  cursor: ClickUpSyncCursor;
  hasMore: boolean;
  stats: z.infer<typeof ClickUpSyncBatchStatsSchema>;
}

export interface ClickUpTransformContext {
  connectorId: string;
  connectorType: string;
  teamId: string;
  workspaceId: string;
  workspaceName?: string;
}

export const ClickUpClientConfigSchema = z.object({
  connectorId: z.string(),
  accessToken: z.string().optional(),
  workspaceId: z.string(),
  rateLimitConfig: z
    .object({
      requestsPerMinute: z.number().optional(),
      requestsPerHour: z.number().optional(),
      burstLimit: z.number().optional(),
    })
    .optional(),
  timeout: z.number().optional(),
});

export type ClickUpClientConfig = z.infer<typeof ClickUpClientConfigSchema>;

export const ClickUpRateLimitStateSchema = z.object({
  remaining: z.number(),
  resetAt: z.number(),
  retryAfter: z.number().optional(),
});

export type ClickUpRateLimitState = z.infer<typeof ClickUpRateLimitStateSchema>;
