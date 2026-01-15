import { z } from "zod";

export const GmailHeaderSchema = z.object({
  name: z.string(),
  value: z.string(),
});

export type GmailHeader = z.infer<typeof GmailHeaderSchema>;

export const GmailBodySchema = z.object({
  attachmentId: z.string().optional(),
  size: z.number(),
  data: z.string().optional(),
});

export type GmailBody = z.infer<typeof GmailBodySchema>;

export const GmailPartSchema: z.ZodType<GmailPart> = z.lazy(() =>
  z.object({
    partId: z.string().optional(),
    mimeType: z.string(),
    filename: z.string().optional(),
    headers: z.array(GmailHeaderSchema).optional(),
    body: GmailBodySchema.optional(),
    parts: z.array(GmailPartSchema).optional(),
  })
);

export type GmailPart = {
  partId?: string;
  mimeType: string;
  filename?: string;
  headers?: GmailHeader[];
  body?: GmailBody;
  parts?: GmailPart[];
};

export const GmailPayloadSchema = z.object({
  partId: z.string().optional(),
  mimeType: z.string().optional(),
  filename: z.string().optional(),
  headers: z.array(GmailHeaderSchema).optional(),
  body: GmailBodySchema.optional(),
  parts: z.array(GmailPartSchema).optional(),
});

export type GmailPayload = z.infer<typeof GmailPayloadSchema>;

export const GmailMessageSchema = z.object({
  id: z.string(),
  threadId: z.string(),
  labelIds: z.array(z.string()).optional(),
  snippet: z.string().optional(),
  historyId: z.string().optional(),
  internalDate: z.string().optional(),
  payload: GmailPayloadSchema.optional(),
  sizeEstimate: z.number().optional(),
  raw: z.string().optional(),
});

export type GmailMessage = z.infer<typeof GmailMessageSchema>;

export const GmailMessageListItemSchema = z.object({
  id: z.string(),
  threadId: z.string(),
});

export type GmailMessageListItem = z.infer<typeof GmailMessageListItemSchema>;

export const GmailThreadSchema = z.object({
  id: z.string(),
  historyId: z.string().optional(),
  snippet: z.string().optional(),
  messages: z.array(GmailMessageSchema).optional(),
});

export type GmailThread = z.infer<typeof GmailThreadSchema>;

export const GmailLabelColorSchema = z.object({
  textColor: z.string().optional(),
  backgroundColor: z.string().optional(),
});

export type GmailLabelColor = z.infer<typeof GmailLabelColorSchema>;

export const GmailLabelSchema = z.object({
  id: z.string(),
  name: z.string(),
  messageListVisibility: z.enum(["show", "hide"]).optional(),
  labelListVisibility: z
    .enum(["labelShow", "labelShowIfUnread", "labelHide"])
    .optional(),
  type: z.enum(["system", "user"]).optional(),
  messagesTotal: z.number().optional(),
  messagesUnread: z.number().optional(),
  threadsTotal: z.number().optional(),
  threadsUnread: z.number().optional(),
  color: GmailLabelColorSchema.optional(),
});

export type GmailLabel = z.infer<typeof GmailLabelSchema>;

export const GmailHistoryMessageAddedSchema = z.object({
  message: GmailMessageSchema,
});

export const GmailHistoryMessageDeletedSchema = z.object({
  message: z.object({
    id: z.string(),
    threadId: z.string(),
  }),
});

export const GmailHistoryLabelAddedSchema = z.object({
  message: z.object({
    id: z.string(),
    threadId: z.string(),
    labelIds: z.array(z.string()).optional(),
  }),
  labelIds: z.array(z.string()),
});

export const GmailHistoryLabelRemovedSchema = z.object({
  message: z.object({
    id: z.string(),
    threadId: z.string(),
    labelIds: z.array(z.string()).optional(),
  }),
  labelIds: z.array(z.string()),
});

export const GmailHistoryRecordSchema = z.object({
  id: z.string(),
  messages: z.array(GmailMessageSchema).optional(),
  messagesAdded: z.array(GmailHistoryMessageAddedSchema).optional(),
  messagesDeleted: z.array(GmailHistoryMessageDeletedSchema).optional(),
  labelsAdded: z.array(GmailHistoryLabelAddedSchema).optional(),
  labelsRemoved: z.array(GmailHistoryLabelRemovedSchema).optional(),
});

export type GmailHistoryRecord = z.infer<typeof GmailHistoryRecordSchema>;

export const GmailListMessagesResponseSchema = z.object({
  messages: z.array(GmailMessageListItemSchema).optional(),
  nextPageToken: z.string().optional(),
  resultSizeEstimate: z.number().optional(),
});

export type GmailListMessagesResponse = z.infer<
  typeof GmailListMessagesResponseSchema
>;

export const GmailListThreadsResponseSchema = z.object({
  threads: z
    .array(
      z.object({
        id: z.string(),
        snippet: z.string().optional(),
        historyId: z.string().optional(),
      })
    )
    .optional(),
  nextPageToken: z.string().optional(),
  resultSizeEstimate: z.number().optional(),
});

export type GmailListThreadsResponse = z.infer<
  typeof GmailListThreadsResponseSchema
>;

export const GmailListLabelsResponseSchema = z.object({
  labels: z.array(GmailLabelSchema).optional(),
});

export type GmailListLabelsResponse = z.infer<
  typeof GmailListLabelsResponseSchema
>;

export const GmailHistoryListResponseSchema = z.object({
  history: z.array(GmailHistoryRecordSchema).optional(),
  nextPageToken: z.string().optional(),
  historyId: z.string().optional(),
});

export type GmailHistoryListResponse = z.infer<
  typeof GmailHistoryListResponseSchema
>;

export const GmailWatchResponseSchema = z.object({
  historyId: z.string(),
  expiration: z.string(),
});

export type GmailWatchResponse = z.infer<typeof GmailWatchResponseSchema>;

export const GmailProfileSchema = z.object({
  emailAddress: z.string(),
  messagesTotal: z.number().optional(),
  threadsTotal: z.number().optional(),
  historyId: z.string().optional(),
});

export type GmailProfile = z.infer<typeof GmailProfileSchema>;

export const GmailAttachmentSchema = z.object({
  size: z.number(),
  data: z.string().optional(),
});

export type GmailAttachment = z.infer<typeof GmailAttachmentSchema>;

export const GmailAttachmentInfoSchema = z.object({
  attachmentId: z.string(),
  messageId: z.string(),
  threadId: z.string(),
  filename: z.string(),
  mimeType: z.string(),
  size: z.number(),
  senderEmail: z.string().optional(),
  senderName: z.string().optional(),
});

export type GmailAttachmentInfo = z.infer<typeof GmailAttachmentInfoSchema>;

export const GmailMediaInfoSchema = z.object({
  attachmentId: z.string(),
  messageId: z.string(),
  threadId: z.string(),
  filename: z.string(),
  mimeType: z.string(),
  size: z.number(),
  mediaType: z.enum(["video", "audio"]),
  senderEmail: z.string().optional(),
  senderName: z.string().optional(),
});

export type GmailMediaInfo = z.infer<typeof GmailMediaInfoSchema>;

export const GmailSyncCursorSchema = z.object({
  historyId: z.string().optional(),
  lastFullSync: z.number().optional(),
  lastMessageTimestamp: z.number().optional(),
  pageToken: z.string().optional(),
  watchExpiration: z.number().optional(),
  labelCursors: z.record(z.string(), z.string()).optional(),
});

export type GmailSyncCursor = z.infer<typeof GmailSyncCursorSchema>;

export const GmailSyncOptionsSchema = z.object({
  cursor: GmailSyncCursorSchema.optional(),
  batchSize: z.number().optional(),
  forceFullSync: z.boolean().optional(),
  includeLabels: z.array(z.string()).optional(),
  excludeLabels: z.array(z.string()).optional(),
  lookbackDays: z.number().optional(),
  indexAttachments: z.boolean().optional(),
  indexMedia: z.boolean().optional(),
});

export type GmailSyncOptions = z.infer<typeof GmailSyncOptionsSchema>;

export const GmailSyncBatchStatsSchema = z.object({
  processed: z.number(),
  skipped: z.number(),
  errors: z.number(),
});

export interface GmailSyncBatch<T> {
  items: T[];
  cursor: GmailSyncCursor;
  hasMore: boolean;
  stats: z.infer<typeof GmailSyncBatchStatsSchema>;
}

export const GmailTransformContextSchema = z.object({
  connectorId: z.string(),
  connectorType: z.string(),
  teamId: z.string(),
  workspaceId: z.string(),
  userEmail: z.string(),
});

export type GmailTransformContext = z.infer<typeof GmailTransformContextSchema>;

export const GmailRateLimitConfigSchema = z.object({
  requestsPerMinute: z.number().optional(),
  requestsPerHour: z.number().optional(),
  burstLimit: z.number().optional(),
});

export type GmailRateLimitConfig = z.infer<typeof GmailRateLimitConfigSchema>;

export const GmailClientConfigSchema = z.object({
  accessToken: z.string(),
  connectorId: z.string(),
  userEmail: z.string().optional(),
  rateLimitConfig: GmailRateLimitConfigSchema.optional(),
  timeout: z.number().optional(),
  debug: z.boolean().optional(),
});

export type GmailClientConfig = z.infer<typeof GmailClientConfigSchema>;

export const GmailRateLimitStateSchema = z.object({
  remaining: z.number(),
  resetAt: z.number(),
  retryAfter: z.number().optional(),
});

export type GmailRateLimitState = z.infer<typeof GmailRateLimitStateSchema>;

export const GmailErrorCodesSchema = z.object({
  RATE_LIMITED: z.literal("rateLimitExceeded"),
  QUOTA_EXCEEDED: z.literal("quotaExceeded"),
  UNAUTHORIZED: z.literal("unauthorized"),
  FORBIDDEN: z.literal("forbidden"),
  NOT_FOUND: z.literal("notFound"),
  INVALID_GRANT: z.literal("invalid_grant"),
  BACKEND_ERROR: z.literal("backendError"),
  SERVICE_UNAVAILABLE: z.literal("serviceUnavailable"),
  HISTORY_ID_EXPIRED: z.literal("historyIdExpired"),
});

export const GmailErrorCodes = {
  RATE_LIMITED: "rateLimitExceeded",
  QUOTA_EXCEEDED: "quotaExceeded",
  UNAUTHORIZED: "unauthorized",
  FORBIDDEN: "forbidden",
  NOT_FOUND: "notFound",
  INVALID_GRANT: "invalid_grant",
  BACKEND_ERROR: "backendError",
  SERVICE_UNAVAILABLE: "serviceUnavailable",
  HISTORY_ID_EXPIRED: "historyIdExpired",
} as const;

export type GmailErrorCode =
  (typeof GmailErrorCodes)[keyof typeof GmailErrorCodes];

export const ParsedEmailHeadersSchema = z.object({
  from: z.string().optional(),
  to: z.array(z.string()).optional(),
  cc: z.array(z.string()).optional(),
  bcc: z.array(z.string()).optional(),
  subject: z.string().optional(),
  date: z.date().optional(),
  messageId: z.string().optional(),
  inReplyTo: z.string().optional(),
  references: z.array(z.string()).optional(),
});

export type ParsedEmailHeaders = z.infer<typeof ParsedEmailHeadersSchema>;

export const ExtractedEmailContentSchema = z.object({
  plain: z.string().optional(),
  html: z.string().optional(),
  attachments: z.array(GmailAttachmentInfoSchema),
  media: z.array(GmailMediaInfoSchema),
});

export type ExtractedEmailContent = z.infer<typeof ExtractedEmailContentSchema>;

export const GMAIL_SYSTEM_LABELS = [
  "INBOX",
  "SENT",
  "DRAFT",
  "SPAM",
  "TRASH",
  "UNREAD",
  "STARRED",
  "IMPORTANT",
  "CATEGORY_PERSONAL",
  "CATEGORY_SOCIAL",
  "CATEGORY_PROMOTIONS",
  "CATEGORY_UPDATES",
  "CATEGORY_FORUMS",
] as const;

export type GmailSystemLabel = (typeof GMAIL_SYSTEM_LABELS)[number];

export const SUPPORTED_ATTACHMENT_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
  "text/csv",
  "text/markdown",
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
] as const;

export const SUPPORTED_MEDIA_TYPES = [
  "video/mp4",
  "video/quicktime",
  "video/x-msvideo",
  "video/webm",
  "audio/mpeg",
  "audio/wav",
  "audio/mp4",
  "audio/webm",
  "audio/ogg",
] as const;

export function isMediaType(mimeType: string): boolean {
  return SUPPORTED_MEDIA_TYPES.some((type) => {
    const prefix = type.split("/")[0];
    return prefix && mimeType.startsWith(prefix);
  });
}

export function isSupportedAttachment(mimeType: string): boolean {
  return SUPPORTED_ATTACHMENT_TYPES.includes(
    mimeType as (typeof SUPPORTED_ATTACHMENT_TYPES)[number]
  );
}
