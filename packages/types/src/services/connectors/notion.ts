import { z } from "zod";

export const NOTION_API_BASE = "https://api.notion.com/v1";
export const NOTION_API_VERSION = "2022-06-28";

export const NotionColorSchema = z.enum([
  "default",
  "gray",
  "brown",
  "orange",
  "yellow",
  "green",
  "blue",
  "purple",
  "pink",
  "red",
  "gray_background",
  "brown_background",
  "orange_background",
  "yellow_background",
  "green_background",
  "blue_background",
  "purple_background",
  "pink_background",
  "red_background",
]);

export type NotionColor = z.infer<typeof NotionColorSchema>;

export const NotionAnnotationsSchema = z.object({
  bold: z.boolean(),
  italic: z.boolean(),
  strikethrough: z.boolean(),
  underline: z.boolean(),
  code: z.boolean(),
  color: NotionColorSchema,
});

export type NotionAnnotations = z.infer<typeof NotionAnnotationsSchema>;

export const NotionTextLinkSchema = z
  .object({
    url: z.string(),
  })
  .nullable();

export type NotionTextLink = z.infer<typeof NotionTextLinkSchema>;

export const NotionRichTextBaseSchema = z.object({
  plain_text: z.string(),
  href: z.string().nullable(),
  annotations: NotionAnnotationsSchema,
});

export const NotionTextRichTextSchema = NotionRichTextBaseSchema.extend({
  type: z.literal("text"),
  text: z.object({
    content: z.string(),
    link: NotionTextLinkSchema,
  }),
});

export type NotionTextRichText = z.infer<typeof NotionTextRichTextSchema>;

export const NotionMentionUserSchema = z.object({
  type: z.literal("user"),
  user: z.object({
    object: z.literal("user"),
    id: z.string(),
  }),
});

export type NotionMentionUser = z.infer<typeof NotionMentionUserSchema>;

export const NotionMentionPageSchema = z.object({
  type: z.literal("page"),
  page: z.object({ id: z.string() }),
});

export type NotionMentionPage = z.infer<typeof NotionMentionPageSchema>;

export const NotionMentionDatabaseSchema = z.object({
  type: z.literal("database"),
  database: z.object({ id: z.string() }),
});

export type NotionMentionDatabase = z.infer<typeof NotionMentionDatabaseSchema>;

export const NotionMentionDateSchema = z.object({
  type: z.literal("date"),
  date: z.object({
    start: z.string(),
    end: z.string().nullable(),
    time_zone: z.string().nullable().optional(),
  }),
});

export type NotionMentionDate = z.infer<typeof NotionMentionDateSchema>;

export const NotionMentionLinkPreviewSchema = z.object({
  type: z.literal("link_preview"),
  link_preview: z.object({ url: z.string() }),
});

export type NotionMentionLinkPreview = z.infer<
  typeof NotionMentionLinkPreviewSchema
>;

export const NotionMentionSchema = z.discriminatedUnion("type", [
  NotionMentionUserSchema,
  NotionMentionPageSchema,
  NotionMentionDatabaseSchema,
  NotionMentionDateSchema,
  NotionMentionLinkPreviewSchema,
]);

export type NotionMention = z.infer<typeof NotionMentionSchema>;

export const NotionMentionRichTextSchema = NotionRichTextBaseSchema.extend({
  type: z.literal("mention"),
  mention: NotionMentionSchema,
});

export type NotionMentionRichText = z.infer<typeof NotionMentionRichTextSchema>;

export const NotionEquationRichTextSchema = NotionRichTextBaseSchema.extend({
  type: z.literal("equation"),
  equation: z.object({ expression: z.string() }),
});

export type NotionEquationRichText = z.infer<
  typeof NotionEquationRichTextSchema
>;

export const NotionRichTextSchema = z.discriminatedUnion("type", [
  NotionTextRichTextSchema,
  NotionMentionRichTextSchema,
  NotionEquationRichTextSchema,
]);

export type NotionRichText = z.infer<typeof NotionRichTextSchema>;

export const NotionParentPageSchema = z.object({
  type: z.literal("page_id"),
  page_id: z.string(),
});

export type NotionParentPage = z.infer<typeof NotionParentPageSchema>;

export const NotionParentDatabaseSchema = z.object({
  type: z.literal("database_id"),
  database_id: z.string(),
});

export type NotionParentDatabase = z.infer<typeof NotionParentDatabaseSchema>;

export const NotionParentWorkspaceSchema = z.object({
  type: z.literal("workspace"),
  workspace: z.literal(true),
});

export type NotionParentWorkspace = z.infer<typeof NotionParentWorkspaceSchema>;

export const NotionParentBlockSchema = z.object({
  type: z.literal("block_id"),
  block_id: z.string(),
});

export type NotionParentBlock = z.infer<typeof NotionParentBlockSchema>;

export const NotionParentSchema = z.discriminatedUnion("type", [
  NotionParentPageSchema,
  NotionParentDatabaseSchema,
  NotionParentWorkspaceSchema,
  NotionParentBlockSchema,
]);

export type NotionParent = z.infer<typeof NotionParentSchema>;

export const NotionUserSchema = z.object({
  object: z.literal("user"),
  id: z.string(),
  type: z.enum(["person", "bot"]).optional(),
  name: z.string().optional(),
  avatar_url: z.string().nullable().optional(),
  person: z.object({ email: z.string() }).optional(),
  bot: z.record(z.string(), z.unknown()).optional(),
});

export type NotionUser = z.infer<typeof NotionUserSchema>;

export const NotionIconEmojiSchema = z.object({
  type: z.literal("emoji"),
  emoji: z.string(),
});

export type NotionIconEmoji = z.infer<typeof NotionIconEmojiSchema>;

export const NotionIconExternalSchema = z.object({
  type: z.literal("external"),
  external: z.object({ url: z.string() }),
});

export type NotionIconExternal = z.infer<typeof NotionIconExternalSchema>;

export const NotionIconFileSchema = z.object({
  type: z.literal("file"),
  file: z.object({
    url: z.string(),
    expiry_time: z.string(),
  }),
});

export type NotionIconFile = z.infer<typeof NotionIconFileSchema>;

export const NotionIconSchema = z.discriminatedUnion("type", [
  NotionIconEmojiSchema,
  NotionIconExternalSchema,
  NotionIconFileSchema,
]);

export type NotionIcon = z.infer<typeof NotionIconSchema>;

export const NotionCoverExternalSchema = z.object({
  type: z.literal("external"),
  external: z.object({ url: z.string() }),
});

export type NotionCoverExternal = z.infer<typeof NotionCoverExternalSchema>;

export const NotionCoverFileSchema = z.object({
  type: z.literal("file"),
  file: z.object({
    url: z.string(),
    expiry_time: z.string(),
  }),
});

export type NotionCoverFile = z.infer<typeof NotionCoverFileSchema>;

export const NotionCoverSchema = z.discriminatedUnion("type", [
  NotionCoverExternalSchema,
  NotionCoverFileSchema,
]);

export type NotionCover = z.infer<typeof NotionCoverSchema>;

export const NotionPageSchema = z.object({
  object: z.literal("page"),
  id: z.string(),
  created_time: z.string(),
  last_edited_time: z.string(),
  created_by: NotionUserSchema,
  last_edited_by: NotionUserSchema,
  cover: NotionCoverSchema.nullable(),
  icon: NotionIconSchema.nullable(),
  parent: NotionParentSchema,
  archived: z.boolean(),
  in_trash: z.boolean().optional(),
  properties: z.record(z.string(), z.unknown()),
  url: z.string(),
  public_url: z.string().nullable().optional(),
});

export type NotionPage = z.infer<typeof NotionPageSchema>;

export const NotionDatabasePropertySchema = z
  .object({
    id: z.string(),
    name: z.string(),
    type: z.string(),
  })
  .passthrough();

export type NotionDatabaseProperty = z.infer<
  typeof NotionDatabasePropertySchema
>;

export const NotionDatabaseSchema = z.object({
  object: z.literal("database"),
  id: z.string(),
  created_time: z.string(),
  last_edited_time: z.string(),
  created_by: NotionUserSchema,
  last_edited_by: NotionUserSchema,
  title: z.array(NotionRichTextSchema),
  description: z.array(NotionRichTextSchema),
  icon: NotionIconSchema.nullable(),
  cover: NotionCoverSchema.nullable(),
  properties: z.record(z.string(), NotionDatabasePropertySchema),
  parent: NotionParentSchema,
  url: z.string(),
  public_url: z.string().nullable().optional(),
  archived: z.boolean(),
  in_trash: z.boolean().optional(),
  is_inline: z.boolean().optional(),
});

export type NotionDatabase = z.infer<typeof NotionDatabaseSchema>;

export const NotionBlockBaseSchema = z.object({
  object: z.literal("block"),
  id: z.string(),
  parent: NotionParentSchema,
  created_time: z.string(),
  last_edited_time: z.string(),
  created_by: NotionUserSchema,
  last_edited_by: NotionUserSchema,
  has_children: z.boolean(),
  archived: z.boolean(),
  in_trash: z.boolean().optional(),
  type: z.string(),
});

export type NotionBlockBase = z.infer<typeof NotionBlockBaseSchema>;

export const NotionBlockSchema = NotionBlockBaseSchema.passthrough();

export type NotionBlock = z.infer<typeof NotionBlockSchema>;

export const NotionCommentSchema = z.object({
  object: z.literal("comment"),
  id: z.string(),
  parent: z.object({
    type: z.enum(["page_id", "block_id"]),
    page_id: z.string().optional(),
    block_id: z.string().optional(),
  }),
  discussion_id: z.string(),
  created_time: z.string(),
  last_edited_time: z.string(),
  created_by: NotionUserSchema,
  rich_text: z.array(NotionRichTextSchema),
});

export type NotionComment = z.infer<typeof NotionCommentSchema>;

export const NotionPaginatedResponseSchema = <T extends z.ZodTypeAny>(
  resultSchema: T
) =>
  z.object({
    object: z.literal("list"),
    results: z.array(resultSchema),
    next_cursor: z.string().nullable(),
    has_more: z.boolean(),
    type: z.string().optional(),
  });

export const NotionSearchResponseSchema = NotionPaginatedResponseSchema(
  z.union([NotionPageSchema, NotionDatabaseSchema])
);

export type NotionSearchResponse = z.infer<typeof NotionSearchResponseSchema>;

export const NotionBlockChildrenResponseSchema =
  NotionPaginatedResponseSchema(NotionBlockSchema);

export type NotionBlockChildrenResponse = z.infer<
  typeof NotionBlockChildrenResponseSchema
>;

export const NotionCommentsResponseSchema =
  NotionPaginatedResponseSchema(NotionCommentSchema);

export type NotionCommentsResponse = z.infer<
  typeof NotionCommentsResponseSchema
>;

export const NotionDatabaseQueryResponseSchema =
  NotionPaginatedResponseSchema(NotionPageSchema);

export type NotionDatabaseQueryResponse = z.infer<
  typeof NotionDatabaseQueryResponseSchema
>;

export const NotionWebhookEventTypeSchema = z.enum([
  "page.content_updated",
  "page.created",
  "page.deleted",
  "page.properties_updated",
  "page.restored",
  "page.moved",
  "page.archived",
  "page.unarchived",
  "database.created",
  "database.content_updated",
  "database.properties_updated",
  "database.deleted",
  "comment.created",
  "comment.deleted",
]);

export type NotionWebhookEventType = z.infer<
  typeof NotionWebhookEventTypeSchema
>;

export const NotionWebhookPayloadSchema = z.object({
  type: NotionWebhookEventTypeSchema,
  timestamp: z.string(),
  workspace_id: z.string(),
  data: z
    .object({
      page_id: z.string().optional(),
      database_id: z.string().optional(),
      block_id: z.string().optional(),
      comment_id: z.string().optional(),
    })
    .passthrough(),
});

export type NotionWebhookPayload = z.infer<typeof NotionWebhookPayloadSchema>;

export const NotionSyncCursorSchema = z.object({
  lastSyncTime: z.number().optional(),
  lastEditedTime: z.string().optional(),
  pagesCursor: z.string().optional(),
  databasesCursor: z.string().optional(),
  watchChannelId: z.string().optional(),
  watchExpiration: z.number().optional(),
});

export type NotionSyncCursor = z.infer<typeof NotionSyncCursorSchema>;

export interface NotionSyncOptions {
  cursor?: NotionSyncCursor;
  batchSize?: number;
  forceFullSync?: boolean;
  extractContent?: boolean;
  extractComments?: boolean;
  maxBlockDepth?: number;
  lookbackDays?: number;
  onStageChange?: (
    stage: string,
    current: number,
    item?: string
  ) => Promise<void>;
}

export const NotionSyncBatchStatsSchema = z.object({
  processed: z.number(),
  skipped: z.number(),
  errors: z.number(),
});

export interface NotionSyncBatch<T> {
  items: T[];
  cursor: NotionSyncCursor;
  hasMore: boolean;
  stats: z.infer<typeof NotionSyncBatchStatsSchema>;
}

export interface NotionUserLookup {
  get(userId: string): NotionUser | undefined;
  getName(userId: string): string | undefined;
  getEmail(userId: string): string | undefined;
  getAvatar(userId: string): string | undefined;
  has(userId: string): boolean;
  size: number;
}

export interface NotionTransformContext {
  connectorId: string;
  connectorType: string;
  teamId: string;
  workspaceId: string;
  workspaceName?: string;
  userLookup?: NotionUserLookup;
}

export const NotionRateLimitConfigSchema = z.object({
  requestsPerMinute: z.number().optional(),
  requestsPerHour: z.number().optional(),
  burstLimit: z.number().optional(),
});

export type NotionRateLimitConfig = z.infer<typeof NotionRateLimitConfigSchema>;

export const NotionClientConfigSchema = z.object({
  connectorId: z.string(),
  accessToken: z.string().optional(),
  rateLimitConfig: NotionRateLimitConfigSchema.optional(),
  timeout: z.number().optional(),
  debug: z.boolean().optional(),
});

export type NotionClientConfig = z.infer<typeof NotionClientConfigSchema>;

export const NotionRateLimitStateSchema = z.object({
  remaining: z.number(),
  resetAt: z.number(),
  retryAfter: z.number().optional(),
});

export type NotionRateLimitState = z.infer<typeof NotionRateLimitStateSchema>;

export const NotionErrorCodes = {
  RATE_LIMITED: "rate_limited",
  UNAUTHORIZED: "unauthorized",
  FORBIDDEN: "forbidden",
  NOT_FOUND: "object_not_found",
  VALIDATION_ERROR: "validation_error",
  CONFLICT: "conflict_error",
  INTERNAL_ERROR: "internal_server_error",
  SERVICE_UNAVAILABLE: "service_unavailable",
} as const;

export type NotionErrorCode =
  (typeof NotionErrorCodes)[keyof typeof NotionErrorCodes];

export const NotionApiErrorOptionsSchema = z.object({
  message: z.string(),
  code: z.string(),
  retryable: z.boolean().optional(),
  retryAfter: z.number().optional(),
  statusCode: z.number().optional(),
});

export type NotionApiErrorOptions = z.infer<typeof NotionApiErrorOptionsSchema>;
