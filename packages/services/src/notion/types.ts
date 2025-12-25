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

export const NotionAnnotationsSchema = z.object({
  bold: z.boolean(),
  italic: z.boolean(),
  strikethrough: z.boolean(),
  underline: z.boolean(),
  code: z.boolean(),
  color: NotionColorSchema,
});

export const NotionTextLinkSchema = z
  .object({
    url: z.string(),
  })
  .nullable();

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

export const NotionMentionUserSchema = z.object({
  type: z.literal("user"),
  user: z.object({
    object: z.literal("user"),
    id: z.string(),
  }),
});

export const NotionMentionPageSchema = z.object({
  type: z.literal("page"),
  page: z.object({ id: z.string() }),
});

export const NotionMentionDatabaseSchema = z.object({
  type: z.literal("database"),
  database: z.object({ id: z.string() }),
});

export const NotionMentionDateSchema = z.object({
  type: z.literal("date"),
  date: z.object({
    start: z.string(),
    end: z.string().nullable(),
    time_zone: z.string().nullable().optional(),
  }),
});

export const NotionMentionLinkPreviewSchema = z.object({
  type: z.literal("link_preview"),
  link_preview: z.object({ url: z.string() }),
});

export const NotionMentionSchema = z.discriminatedUnion("type", [
  NotionMentionUserSchema,
  NotionMentionPageSchema,
  NotionMentionDatabaseSchema,
  NotionMentionDateSchema,
  NotionMentionLinkPreviewSchema,
]);

export const NotionMentionRichTextSchema = NotionRichTextBaseSchema.extend({
  type: z.literal("mention"),
  mention: NotionMentionSchema,
});

export const NotionEquationRichTextSchema = NotionRichTextBaseSchema.extend({
  type: z.literal("equation"),
  equation: z.object({ expression: z.string() }),
});

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

export const NotionParentDatabaseSchema = z.object({
  type: z.literal("database_id"),
  database_id: z.string(),
});

export const NotionParentWorkspaceSchema = z.object({
  type: z.literal("workspace"),
  workspace: z.literal(true),
});

export const NotionParentBlockSchema = z.object({
  type: z.literal("block_id"),
  block_id: z.string(),
});

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

export const NotionIconExternalSchema = z.object({
  type: z.literal("external"),
  external: z.object({ url: z.string() }),
});

export const NotionIconFileSchema = z.object({
  type: z.literal("file"),
  file: z.object({
    url: z.string(),
    expiry_time: z.string(),
  }),
});

export const NotionIconSchema = z.discriminatedUnion("type", [
  NotionIconEmojiSchema,
  NotionIconExternalSchema,
  NotionIconFileSchema,
]);

export const NotionCoverExternalSchema = z.object({
  type: z.literal("external"),
  external: z.object({ url: z.string() }),
});

export const NotionCoverFileSchema = z.object({
  type: z.literal("file"),
  file: z.object({
    url: z.string(),
    expiry_time: z.string(),
  }),
});

export const NotionCoverSchema = z.discriminatedUnion("type", [
  NotionCoverExternalSchema,
  NotionCoverFileSchema,
]);

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

export interface NotionSyncCursor {
  lastSyncTime?: number;
  lastEditedTime?: string;
  pagesCursor?: string;
  databasesCursor?: string;
  watchChannelId?: string;
  watchExpiration?: number;
}

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

export interface NotionSyncBatch<T> {
  items: T[];
  cursor: NotionSyncCursor;
  hasMore: boolean;
  stats: {
    processed: number;
    skipped: number;
    errors: number;
  };
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

export interface NotionClientConfig {
  accessToken: string;
  connectorId: string;
  rateLimitConfig?: NotionRateLimitConfig;
  timeout?: number;
  debug?: boolean;
}

export interface NotionRateLimitConfig {
  requestsPerMinute?: number;
  requestsPerHour?: number;
  burstLimit?: number;
}

export interface NotionRateLimitState {
  remaining: number;
  resetAt: number;
  retryAfter?: number;
}

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

export interface NotionApiErrorOptions {
  message: string;
  code: string;
  retryable?: boolean;
  retryAfter?: number;
  statusCode?: number;
}

export class NotionApiError extends Error {
  readonly code: string;
  readonly retryable: boolean;
  readonly retryAfter?: number;
  readonly statusCode?: number;

  constructor(options: NotionApiErrorOptions) {
    super(options.message);
    this.name = "NotionApiError";
    this.code = options.code;
    this.retryable = options.retryable ?? false;
    this.retryAfter = options.retryAfter;
    this.statusCode = options.statusCode;
  }

  static fromResponse(
    statusCode: number,
    errorBody: { code?: string; message?: string }
  ): NotionApiError {
    const message = errorBody.message ?? `Notion API error: ${statusCode}`;
    const code = errorBody.code ?? "unknown";

    const retryableCodes = [429, 500, 502, 503, 504];
    const retryable = retryableCodes.includes(statusCode);

    return new NotionApiError({ message, code, retryable, statusCode });
  }

  static isAuthError(code: string): boolean {
    return (
      code === NotionErrorCodes.UNAUTHORIZED ||
      code === NotionErrorCodes.FORBIDDEN
    );
  }

  static isRateLimitError(code: string): boolean {
    return code === NotionErrorCodes.RATE_LIMITED;
  }
}
