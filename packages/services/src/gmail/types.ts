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

export interface GmailAttachmentInfo {
  attachmentId: string;
  messageId: string;
  threadId: string;
  filename: string;
  mimeType: string;
  size: number;
  senderEmail?: string;
  senderName?: string;
}

export interface GmailMediaInfo {
  attachmentId: string;
  messageId: string;
  threadId: string;
  filename: string;
  mimeType: string;
  size: number;
  mediaType: "video" | "audio";
  senderEmail?: string;
  senderName?: string;
}

export interface GmailSyncCursor {
  historyId?: string;
  lastFullSync?: number;
  lastMessageTimestamp?: number;
  pageToken?: string;
  watchExpiration?: number;
  labelCursors?: Record<string, string>;
}

export interface GmailSyncOptions {
  cursor?: GmailSyncCursor;
  batchSize?: number;
  forceFullSync?: boolean;
  includeLabels?: string[];
  excludeLabels?: string[];
  lookbackDays?: number;
  indexAttachments?: boolean;
  indexMedia?: boolean;
}

export interface GmailSyncBatch<T> {
  items: T[];
  cursor: GmailSyncCursor;
  hasMore: boolean;
  stats: {
    processed: number;
    skipped: number;
    errors: number;
  };
}

export interface GmailTransformContext {
  connectorId: string;
  connectorType: string;
  teamId: string;
  workspaceId: string;
  userEmail: string;
}

export interface GmailClientConfig {
  accessToken: string;
  connectorId: string;
  userEmail?: string;
  rateLimitConfig?: GmailRateLimitConfig;
  timeout?: number;
  debug?: boolean;
}

export interface GmailRateLimitConfig {
  requestsPerMinute?: number;
  requestsPerHour?: number;
  burstLimit?: number;
}

export interface GmailRateLimitState {
  remaining: number;
  resetAt: number;
  retryAfter?: number;
}

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

export class GmailApiError extends Error {
  readonly code: string;
  readonly retryable: boolean;
  readonly retryAfter?: number;
  readonly statusCode?: number;

  // biome-ignore lint/nursery/useMaxParams: error constructor requires all error details
  constructor(
    message: string,
    code: string,
    retryable = false,
    retryAfter?: number,
    statusCode?: number
  ) {
    super(message);
    this.name = "GmailApiError";
    this.code = code;
    this.retryable = retryable;
    this.retryAfter = retryAfter;
    this.statusCode = statusCode;
  }

  static fromResponse(
    statusCode: number,
    errorBody: { error?: { message?: string; code?: number; status?: string } }
  ): GmailApiError {
    const message =
      errorBody.error?.message ?? `Gmail API error: ${statusCode}`;
    const status = errorBody.error?.status ?? "UNKNOWN";

    const retryableCodes = [429, 500, 502, 503, 504];
    const retryable = retryableCodes.includes(statusCode);

    let code = status;
    if (statusCode === 401) {
      code = GmailErrorCodes.UNAUTHORIZED;
    }
    if (statusCode === 403) {
      code = GmailErrorCodes.FORBIDDEN;
    }
    if (statusCode === 404) {
      code = GmailErrorCodes.NOT_FOUND;
    }
    if (statusCode === 429) {
      code = GmailErrorCodes.RATE_LIMITED;
    }

    return new GmailApiError(message, code, retryable, undefined, statusCode);
  }

  static isAuthError(code: string): boolean {
    return (
      code === GmailErrorCodes.UNAUTHORIZED ||
      code === GmailErrorCodes.INVALID_GRANT
    );
  }

  static isQuotaError(code: string): boolean {
    return (
      code === GmailErrorCodes.RATE_LIMITED ||
      code === GmailErrorCodes.QUOTA_EXCEEDED
    );
  }

  static isHistoryExpired(code: string, message: string): boolean {
    return code === GmailErrorCodes.NOT_FOUND && message.includes("historyId");
  }
}

export interface ParsedEmailHeaders {
  from?: string;
  to?: string[];
  cc?: string[];
  bcc?: string[];
  subject?: string;
  date?: Date;
  messageId?: string;
  inReplyTo?: string;
  references?: string[];
}

export interface ExtractedEmailContent {
  plain?: string;
  html?: string;
  attachments: GmailAttachmentInfo[];
  media: GmailMediaInfo[];
}

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
