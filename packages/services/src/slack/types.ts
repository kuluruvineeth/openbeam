import { z } from "zod";

export const SlackFileSchema = z.object({
  id: z.string(),
  name: z.string(),
  title: z.string().optional(),
  mimetype: z.string(),
  filetype: z.string().optional(),
  size: z.number().optional(),
  url_private: z.string().optional(),
  url_private_download: z.string().optional(),
  permalink: z.string().optional(),
  thumb_64: z.string().optional(),
  thumb_80: z.string().optional(),
  thumb_360: z.string().optional(),
  created: z.number().optional(),
  timestamp: z.number().optional(),
  user: z.string().optional(),
  channels: z.array(z.string()).optional(),
  mode: z.string().optional(),
  is_external: z.boolean().optional(),
});

export type SlackFile = z.infer<typeof SlackFileSchema>;

export const SlackReactionSchema = z.object({
  name: z.string(),
  count: z.number(),
  users: z.array(z.string()),
});

export type SlackReaction = z.infer<typeof SlackReactionSchema>;

export const SlackBlockSchema = z.object({
  type: z.string(),
  block_id: z.string().optional(),
  elements: z.array(z.unknown()).optional(),
  text: z.unknown().optional(),
});

export type SlackBlock = z.infer<typeof SlackBlockSchema>;

export const SlackEditedSchema = z.object({
  user: z.string(),
  ts: z.string(),
});

export type SlackEdited = z.infer<typeof SlackEditedSchema>;

export const SlackMessageSchema = z.object({
  type: z.literal("message").optional(),
  subtype: z.string().optional(),
  ts: z.string(),
  text: z.string().optional(),
  user: z.string().optional(),
  bot_id: z.string().optional(),
  thread_ts: z.string().optional(),
  reply_count: z.number().optional(),
  reply_users_count: z.number().optional(),
  latest_reply: z.string().optional(),
  reactions: z.array(SlackReactionSchema).optional(),
  files: z.array(SlackFileSchema).optional(),
  blocks: z.array(SlackBlockSchema).optional(),
  edited: SlackEditedSchema.optional(),
  attachments: z.array(z.unknown()).optional(),
  parent_user_id: z.string().optional(),
});

export type SlackMessage = z.infer<typeof SlackMessageSchema>;

export const SlackTopicSchema = z.object({
  value: z.string(),
  creator: z.string(),
  last_set: z.number(),
});

export type SlackTopic = z.infer<typeof SlackTopicSchema>;

export const SlackChannelSchema = z.object({
  id: z.string(),
  name: z.string(),
  name_normalized: z.string().optional(),
  is_channel: z.boolean().optional(),
  is_group: z.boolean().optional(),
  is_im: z.boolean().optional(),
  is_mpim: z.boolean().optional(),
  is_private: z.boolean(),
  is_archived: z.boolean().optional(),
  is_general: z.boolean().optional(),
  is_shared: z.boolean().optional(),
  is_ext_shared: z.boolean().optional(),
  is_org_shared: z.boolean().optional(),
  is_member: z.boolean().optional(),
  creator: z.string().optional(),
  created: z.number().optional(),
  topic: SlackTopicSchema.optional(),
  purpose: SlackTopicSchema.optional(),
  num_members: z.number().optional(),
  members: z.array(z.string()).optional(),
});

export type SlackChannel = z.infer<typeof SlackChannelSchema>;

export const SlackProfileSchema = z.object({
  title: z.string().optional(),
  phone: z.string().optional(),
  skype: z.string().optional(),
  real_name: z.string().optional(),
  real_name_normalized: z.string().optional(),
  display_name: z.string().optional(),
  display_name_normalized: z.string().optional(),
  status_text: z.string().optional(),
  status_emoji: z.string().optional(),
  email: z.string().optional(),
  image_24: z.string().optional(),
  image_32: z.string().optional(),
  image_48: z.string().optional(),
  image_72: z.string().optional(),
  image_192: z.string().optional(),
  image_512: z.string().optional(),
  team: z.string().optional(),
});

export type SlackProfile = z.infer<typeof SlackProfileSchema>;

export const SlackUserSchema = z.object({
  id: z.string(),
  team_id: z.string().optional(),
  name: z.string(),
  deleted: z.boolean().optional(),
  color: z.string().optional(),
  real_name: z.string().optional(),
  tz: z.string().optional(),
  tz_label: z.string().optional(),
  tz_offset: z.number().optional(),
  profile: SlackProfileSchema.optional(),
  is_admin: z.boolean().optional(),
  is_owner: z.boolean().optional(),
  is_primary_owner: z.boolean().optional(),
  is_restricted: z.boolean().optional(),
  is_ultra_restricted: z.boolean().optional(),
  is_bot: z.boolean().optional(),
  is_app_user: z.boolean().optional(),
  updated: z.number().optional(),
});

export type SlackUser = z.infer<typeof SlackUserSchema>;

export const SlackTeamSchema = z.object({
  id: z.string(),
  name: z.string(),
  domain: z.string().optional(),
  email_domain: z.string().optional(),
  icon: z
    .object({
      image_34: z.string().optional(),
      image_44: z.string().optional(),
      image_68: z.string().optional(),
      image_88: z.string().optional(),
      image_102: z.string().optional(),
      image_132: z.string().optional(),
      image_default: z.boolean().optional(),
    })
    .optional(),
});

export type SlackTeam = z.infer<typeof SlackTeamSchema>;

export const SlackApiResponseSchema = z.object({
  ok: z.boolean(),
  error: z.string().optional(),
  warning: z.string().optional(),
  response_metadata: z
    .object({
      next_cursor: z.string().optional(),
      scopes: z.array(z.string()).optional(),
      acceptedScopes: z.array(z.string()).optional(),
    })
    .optional(),
});

export type SlackApiResponse = z.infer<typeof SlackApiResponseSchema>;

export interface PaginationMeta {
  nextCursor?: string;
  hasMore: boolean;
}

export interface SlackClientConfig {
  token: string;
  connectorId: string;
  teamId?: string;
  rateLimitConfig?: {
    requestsPerMinute?: number;
    requestsPerHour?: number;
    burstLimit?: number;
  };
  timeout?: number;
  debug?: boolean;
}

export interface RateLimitState {
  remaining: number;
  resetAt: number;
  retryAfter?: number;
}

export interface SyncCursor {
  lastTimestamp?: string;
  channelCursors?: Record<string, string>;
  lastFullSync?: number;
  lastFileSyncTimestamp?: string;
  lastCanvasSyncTimestamp?: number;
  lastClipSyncTimestamp?: number;
  lastBookmarkSyncTimestamp?: number;
}

export interface SyncOptions {
  cursor?: SyncCursor;
  batchSize?: number;
  includeThreads?: boolean;
  channelTypes?: Array<"public" | "private" | "im" | "mpim">;
  channelIds?: string[];
}

export interface SyncBatch<T> {
  items: T[];
  cursor: SyncCursor;
  hasMore: boolean;
  stats: {
    processed: number;
    skipped: number;
    errors: number;
  };
}

export interface TransformContext {
  connectorId: string;
  connectorType: string;
  teamId: string;
  workspaceId: string;
}

export const SlackSearchMatchSchema = z.object({
  iid: z.string().optional(),
  team: z.string().optional(),
  channel: z
    .object({
      id: z.string(),
      is_channel: z.boolean().optional(),
      is_group: z.boolean().optional(),
      is_im: z.boolean().optional(),
      is_mpim: z.boolean().optional(),
      is_private: z.boolean().optional(),
      name: z.string().optional(),
    })
    .optional(),
  type: z.string().optional(),
  user: z.string().optional(),
  username: z.string().optional(),
  ts: z.string(),
  text: z.string(),
  permalink: z.string().optional(),
});

export type SlackSearchMatch = z.infer<typeof SlackSearchMatchSchema>;

export const SlackSearchResponseSchema = z.object({
  ok: z.boolean(),
  query: z.string().optional(),
  messages: z
    .object({
      total: z.number().optional(),
      pagination: z
        .object({
          total_count: z.number().optional(),
          page: z.number().optional(),
          per_page: z.number().optional(),
          page_count: z.number().optional(),
          first: z.number().optional(),
          last: z.number().optional(),
        })
        .optional(),
      paging: z
        .object({
          count: z.number().optional(),
          total: z.number().optional(),
          page: z.number().optional(),
          pages: z.number().optional(),
        })
        .optional(),
      matches: z.array(SlackSearchMatchSchema).optional(),
    })
    .optional(),
  error: z.string().optional(),
});

export type SlackSearchResponse = z.infer<typeof SlackSearchResponseSchema>;

export interface FederatedSearchOptions {
  limit?: number;
  page?: number;
  sort?: "score" | "timestamp";
  sortDir?: "asc" | "desc";
  channelFilter?: string[];
  channelExclude?: string[];
  includeGroupDms?: boolean;
  maxAgeDays?: number;
}

export const SlackErrorCodes = {
  RATE_LIMITED: "ratelimited",
  NOT_AUTHED: "not_authed",
  INVALID_AUTH: "invalid_auth",
  TOKEN_EXPIRED: "token_expired",
  TOKEN_REVOKED: "token_revoked",
  ACCOUNT_INACTIVE: "account_inactive",
  CHANNEL_NOT_FOUND: "channel_not_found",
  NOT_IN_CHANNEL: "not_in_channel",
  USER_NOT_FOUND: "user_not_found",
  MISSING_SCOPE: "missing_scope",
  INTERNAL_ERROR: "internal_error",
} as const;

export type SlackErrorCode =
  (typeof SlackErrorCodes)[keyof typeof SlackErrorCodes];

export class SlackApiError extends Error {
  readonly code: string;
  readonly retryable: boolean;
  readonly retryAfter?: number;

  constructor(
    message: string,
    code: string,
    retryable = false,
    retryAfter?: number
  ) {
    super(message);
    this.name = "SlackApiError";
    this.code = code;
    this.retryable = retryable;
    this.retryAfter = retryAfter;
  }

  static fromResponse(error: string, retryAfter?: number): SlackApiError {
    const retryableCodes: readonly SlackErrorCode[] = [
      SlackErrorCodes.RATE_LIMITED,
      SlackErrorCodes.INTERNAL_ERROR,
    ];
    const retryable = retryableCodes.includes(error as SlackErrorCode);

    return new SlackApiError(
      `Slack API error: ${error}`,
      error,
      retryable,
      retryAfter
    );
  }

  static isAuthError(code: string): boolean {
    const authErrorCodes: readonly SlackErrorCode[] = [
      SlackErrorCodes.NOT_AUTHED,
      SlackErrorCodes.INVALID_AUTH,
      SlackErrorCodes.TOKEN_EXPIRED,
      SlackErrorCodes.TOKEN_REVOKED,
      SlackErrorCodes.ACCOUNT_INACTIVE,
    ];
    return authErrorCodes.includes(code as SlackErrorCode);
  }

  static isScopeError(code: string): boolean {
    return code === SlackErrorCodes.MISSING_SCOPE;
  }

  static getScopeErrorHelp(method: string): string {
    const scopeRequirements: Record<string, string> = {
      "search.messages": "search:read (user scope - requires sync token)",
      "files.list": "files:read",
      "files.info": "files:read",
      "conversations.history": "channels:history or groups:history",
      "conversations.list": "channels:read or groups:read",
      "canvases.sections.lookup": "canvases:read",
      "canvases.access.list": "canvases:read",
      "canvases.access.set": "canvases:write",
    };

    const requiredScope = scopeRequirements[method];
    if (requiredScope) {
      return `Method '${method}' requires scope: ${requiredScope}. Re-authenticate to add this scope.`;
    }
    return `Method '${method}' requires additional scopes. Re-authenticate with the required permissions.`;
  }
}

export const SlackCanvasAccessLevelSchema = z.enum([
  "private",
  "channel",
  "org",
  "external",
]);

export type SlackCanvasAccessLevel = z.infer<
  typeof SlackCanvasAccessLevelSchema
>;

export const SlackCanvasSchema = z.object({
  id: z.string(),
  title: z.string().optional(),
  channel_id: z.string().optional(),
  document_content: z
    .object({
      markdown: z.string().optional(),
      type: z.string().optional(),
    })
    .optional(),
  last_edited_at: z.number().optional(),
  last_edited_by_user: z
    .object({
      user_id: z.string().optional(),
    })
    .optional(),
  is_published: z.boolean().optional(),
  access_level: SlackCanvasAccessLevelSchema.optional(),
});

export type SlackCanvasRaw = z.infer<typeof SlackCanvasSchema>;

export const SlackClipSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  title: z.string().optional(),
  filetype: z.string().optional(),
  channels: z.array(z.string()).optional(),
  user: z.string().optional(),
  timestamp: z.number().optional(),
  transcription: z
    .object({
      status: z.string().optional(),
      preview: z
        .object({
          content: z.string().optional(),
        })
        .optional(),
    })
    .optional(),
  media_display_type: z.string().optional(),
  url_private: z.string().optional(),
  thumb_video: z.string().optional(),
  duration_ms: z.number().optional(),
  views: z.number().optional(),
});

export type SlackClipRaw = z.infer<typeof SlackClipSchema>;

export const SlackBookmarkTypeSchema = z.enum([
  "link",
  "message",
  "canvas",
  "file",
]);

export type SlackBookmarkType = z.infer<typeof SlackBookmarkTypeSchema>;

export const SlackBookmarkSchema = z.object({
  id: z.string(),
  channel_id: z.string(),
  title: z.string(),
  link: z.string().optional(),
  emoji: z.string().optional(),
  icon_url: z.string().optional(),
  type: SlackBookmarkTypeSchema,
  entity_id: z.string().optional(),
  date_created: z.number(),
  date_updated: z.number().optional(),
  created_by: z.string().optional(),
});

export type SlackBookmarkRaw = z.infer<typeof SlackBookmarkSchema>;
