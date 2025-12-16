import { z } from "zod";

export const SlackEventEnvelopeSchema = z.object({
  token: z.string().optional(),
  team_id: z.string().optional(),
  api_app_id: z.string().optional(),
  type: z.enum(["url_verification", "event_callback", "app_rate_limited"]),
  challenge: z.string().optional(),
  event: z.unknown().optional(),
  event_id: z.string().optional(),
  event_time: z.number().optional(),
  authorizations: z
    .array(
      z.object({
        enterprise_id: z.string().nullable().optional(),
        team_id: z.string().optional(),
        user_id: z.string().optional(),
        is_bot: z.boolean().optional(),
        is_enterprise_install: z.boolean().optional(),
      })
    )
    .optional(),
});

export type SlackEventEnvelope = z.infer<typeof SlackEventEnvelopeSchema>;

export const BaseEventSchema = z.object({
  type: z.string(),
  event_ts: z.string().optional(),
  user: z.string().optional(),
});

export type BaseEvent = z.infer<typeof BaseEventSchema>;

export const MessageEventSchema = z.object({
  type: z.literal("message"),
  subtype: z.string().optional(),
  channel: z.string(),
  user: z.string().optional(),
  bot_id: z.string().optional(),
  text: z.string().optional(),
  ts: z.string(),
  thread_ts: z.string().optional(),
  event_ts: z.string(),
  channel_type: z.enum(["channel", "group", "im", "mpim"]).optional(),
  files: z.array(z.unknown()).optional(),
  blocks: z.array(z.unknown()).optional(),
  attachments: z.array(z.unknown()).optional(),
  edited: z
    .object({
      user: z.string(),
      ts: z.string(),
    })
    .optional(),
});

export type MessageEvent = z.infer<typeof MessageEventSchema>;

export const MessageChangedEventSchema = z.object({
  type: z.literal("message"),
  subtype: z.literal("message_changed"),
  channel: z.string(),
  event_ts: z.string(),
  ts: z.string(),
  message: z.object({
    type: z.literal("message"),
    user: z.string().optional(),
    bot_id: z.string().optional(),
    text: z.string().optional(),
    ts: z.string(),
    thread_ts: z.string().optional(),
    edited: z
      .object({
        user: z.string(),
        ts: z.string(),
      })
      .optional(),
  }),
  previous_message: z.object({
    type: z.literal("message"),
    user: z.string().optional(),
    text: z.string().optional(),
    ts: z.string(),
  }),
});

export type MessageChangedEvent = z.infer<typeof MessageChangedEventSchema>;

export const MessageDeletedEventSchema = z.object({
  type: z.literal("message"),
  subtype: z.literal("message_deleted"),
  channel: z.string(),
  event_ts: z.string(),
  ts: z.string(),
  deleted_ts: z.string(),
  previous_message: z
    .object({
      type: z.literal("message"),
      user: z.string().optional(),
      text: z.string().optional(),
      ts: z.string(),
    })
    .optional(),
});

export type MessageDeletedEvent = z.infer<typeof MessageDeletedEventSchema>;

export const ReactionAddedEventSchema = z.object({
  type: z.literal("reaction_added"),
  user: z.string(),
  reaction: z.string(),
  item: z.object({
    type: z.string(),
    channel: z.string().optional(),
    ts: z.string().optional(),
    file: z.string().optional(),
  }),
  item_user: z.string().optional(),
  event_ts: z.string(),
});

export type ReactionAddedEvent = z.infer<typeof ReactionAddedEventSchema>;

export const ReactionRemovedEventSchema = z.object({
  type: z.literal("reaction_removed"),
  user: z.string(),
  reaction: z.string(),
  item: z.object({
    type: z.string(),
    channel: z.string().optional(),
    ts: z.string().optional(),
    file: z.string().optional(),
  }),
  item_user: z.string().optional(),
  event_ts: z.string(),
});

export type ReactionRemovedEvent = z.infer<typeof ReactionRemovedEventSchema>;

export const ChannelCreatedEventSchema = z.object({
  type: z.literal("channel_created"),
  channel: z.object({
    id: z.string(),
    name: z.string(),
    created: z.number(),
    creator: z.string(),
  }),
  event_ts: z.string(),
});

export type ChannelCreatedEvent = z.infer<typeof ChannelCreatedEventSchema>;

export const ChannelRenameEventSchema = z.object({
  type: z.literal("channel_rename"),
  channel: z.object({
    id: z.string(),
    name: z.string(),
    created: z.number(),
  }),
  event_ts: z.string(),
});

export type ChannelRenameEvent = z.infer<typeof ChannelRenameEventSchema>;

export const ChannelArchiveEventSchema = z.object({
  type: z.literal("channel_archive"),
  channel: z.string(),
  user: z.string(),
  event_ts: z.string(),
});

export type ChannelArchiveEvent = z.infer<typeof ChannelArchiveEventSchema>;

export const ChannelUnarchiveEventSchema = z.object({
  type: z.literal("channel_unarchive"),
  channel: z.string(),
  user: z.string(),
  event_ts: z.string(),
});

export type ChannelUnarchiveEvent = z.infer<typeof ChannelUnarchiveEventSchema>;

export const ChannelDeletedEventSchema = z.object({
  type: z.literal("channel_deleted"),
  channel: z.string(),
  event_ts: z.string(),
});

export type ChannelDeletedEvent = z.infer<typeof ChannelDeletedEventSchema>;

export const MemberJoinedChannelEventSchema = z.object({
  type: z.literal("member_joined_channel"),
  user: z.string(),
  channel: z.string(),
  channel_type: z.enum(["C", "G"]).optional(),
  team: z.string().optional(),
  inviter: z.string().optional(),
  event_ts: z.string(),
});

export type MemberJoinedChannelEvent = z.infer<
  typeof MemberJoinedChannelEventSchema
>;

export const MemberLeftChannelEventSchema = z.object({
  type: z.literal("member_left_channel"),
  user: z.string(),
  channel: z.string(),
  channel_type: z.enum(["C", "G"]).optional(),
  team: z.string().optional(),
  event_ts: z.string(),
});

export type MemberLeftChannelEvent = z.infer<
  typeof MemberLeftChannelEventSchema
>;

export const UserChangeEventSchema = z.object({
  type: z.literal("user_change"),
  user: z.object({
    id: z.string(),
    team_id: z.string().optional(),
    name: z.string(),
    deleted: z.boolean().optional(),
    real_name: z.string().optional(),
    profile: z.unknown().optional(),
  }),
  event_ts: z.string(),
});

export type UserChangeEvent = z.infer<typeof UserChangeEventSchema>;

export const FileSharedEventSchema = z.object({
  type: z.literal("file_shared"),
  file_id: z.string(),
  user_id: z.string(),
  channel_id: z.string().optional(),
  event_ts: z.string(),
});

export type FileSharedEvent = z.infer<typeof FileSharedEventSchema>;

export const FileDeletedEventSchema = z.object({
  type: z.literal("file_deleted"),
  file_id: z.string(),
  event_ts: z.string(),
});

export type FileDeletedEvent = z.infer<typeof FileDeletedEventSchema>;

export const AppMentionEventSchema = z.object({
  type: z.literal("app_mention"),
  user: z.string(),
  text: z.string(),
  ts: z.string(),
  channel: z.string(),
  event_ts: z.string(),
  thread_ts: z.string().optional(),
});

export type AppMentionEvent = z.infer<typeof AppMentionEventSchema>;

export const AssistantThreadStartedEventSchema = z
  .object({
    type: z.literal("assistant_thread_started"),
    assistant_thread: z
      .object({
        user_id: z.string(),
        context: z
          .object({
            channel_id: z.string().optional(),
            team_id: z.string().optional(),
            enterprise_id: z.string().optional(),
          })
          .passthrough(),
        channel_id: z.string(),
        thread_ts: z.string(),
      })
      .passthrough(),
    event_ts: z.string().optional(),
  })
  .passthrough();

export type AssistantThreadStartedEvent = z.infer<
  typeof AssistantThreadStartedEventSchema
>;

export const AssistantThreadContextChangedEventSchema = z
  .object({
    type: z.literal("assistant_thread_context_changed"),
    assistant_thread: z
      .object({
        user_id: z.string(),
        context: z
          .object({
            channel_id: z.string().optional(),
            team_id: z.string().optional(),
            enterprise_id: z.string().optional(),
          })
          .passthrough(),
        channel_id: z.string(),
        thread_ts: z.string(),
      })
      .passthrough(),
    event_ts: z.string().optional(),
  })
  .passthrough();

export type AssistantThreadContextChangedEvent = z.infer<
  typeof AssistantThreadContextChangedEventSchema
>;

export const AppHomeOpenedEventSchema = z.object({
  type: z.literal("app_home_opened"),
  user: z.string(),
  channel: z.string(),
  tab: z.enum(["home", "messages"]),
  event_ts: z.string(),
  view: z
    .object({
      id: z.string(),
      type: z.string(),
    })
    .optional(),
});

export type AppHomeOpenedEvent = z.infer<typeof AppHomeOpenedEventSchema>;

export type SlackEvent =
  | MessageEvent
  | MessageChangedEvent
  | MessageDeletedEvent
  | ReactionAddedEvent
  | ReactionRemovedEvent
  | ChannelCreatedEvent
  | ChannelRenameEvent
  | ChannelArchiveEvent
  | ChannelUnarchiveEvent
  | ChannelDeletedEvent
  | MemberJoinedChannelEvent
  | MemberLeftChannelEvent
  | UserChangeEvent
  | FileSharedEvent
  | FileDeletedEvent
  | AppMentionEvent
  | AssistantThreadStartedEvent
  | AssistantThreadContextChangedEvent
  | AppHomeOpenedEvent;

export type SlackEventType = SlackEvent["type"];
