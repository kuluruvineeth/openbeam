import type {
  SlackBookmarkType,
  SlackChannel,
  SlackMessage,
  TransformContext,
} from "@openplane/types/services/connectors/slack";
import type { Entity, GenericDocument } from "@openplane/vespa";
import { getAllChannelMembers, getChannelInfo } from "../api/channels";
import { getClipInfo } from "../api/clips";
import { fetchSingleMessage } from "../api/messages";
import type { SlackClient } from "../client";
import {
  type BookmarkTransformContext,
  type ClipTransformContext,
  type MessageTransformContext,
  transformBookmark,
  transformClip,
  transformMessage,
} from "../transformers";
import {
  isBookmarkEvent,
  isChannelEvent,
  isFileEvent,
  isMemberEvent,
  isMessageChangedEvent,
  isMessageDeletedEvent,
  isMessageEvent,
  isReactionEvent,
} from "./parser";
import type {
  BookmarkAddedEvent,
  BookmarkDeletedEvent,
  ChannelArchiveEvent,
  ChannelCreatedEvent,
  ChannelDeletedEvent,
  ChannelRenameEvent,
  ChannelUnarchiveEvent,
  FileDeletedEvent,
  FileSharedEvent,
  MemberJoinedChannelEvent,
  MemberLeftChannelEvent,
  MessageChangedEvent,
  MessageDeletedEvent,
  MessageEvent,
  ReactionAddedEvent,
  ReactionRemovedEvent,
  SlackEvent,
} from "./types";

export type DocumentOperation =
  | "create"
  | "update"
  | "delete"
  | "permission_update";

export interface DocumentChange {
  operation: DocumentOperation;
  document?: GenericDocument;
  entity?: Entity;
  documentId?: string;
  entityId?: string;
  permissionUpdate?: {
    channelId: string;
    userId: string;
    action: "add" | "remove";
  };
}

export interface EventHandlerContext extends TransformContext {
  client: SlackClient;
  channelCache?: Map<string, SlackChannel>;
  memberCache?: Map<string, string[]>;
}

export interface EventHandlerResult {
  changes: DocumentChange[];
  errors: Error[];
}

function dispatchMessageEvent(
  event: SlackEvent,
  context: EventHandlerContext
): Promise<EventHandlerResult> | EventHandlerResult {
  if (isMessageChangedEvent(event)) {
    return handleMessageChangedEvent(event, context);
  }
  if (isMessageDeletedEvent(event)) {
    return handleMessageDeletedEvent(event, context);
  }
  return handleMessageEvent(event as MessageEvent, context);
}

function dispatchReactionEvent(
  event: SlackEvent,
  context: EventHandlerContext
): Promise<EventHandlerResult> {
  if (event.type === "reaction_added") {
    return handleReactionAddedEvent(event as ReactionAddedEvent, context);
  }
  return handleReactionRemovedEvent(event as ReactionRemovedEvent, context);
}

function dispatchChannelEvent(
  event: SlackEvent,
  context: EventHandlerContext
): EventHandlerResult {
  switch (event.type) {
    case "channel_created":
      return handleChannelCreatedEvent(event, context);
    case "channel_rename":
      return handleChannelRenameEvent(event, context);
    case "channel_archive":
      return handleChannelArchiveEvent(event, context);
    case "channel_unarchive":
      return handleChannelUnarchiveEvent(event, context);
    case "channel_deleted":
      return handleChannelDeletedEvent(event, context);
    default:
      return { changes: [], errors: [] };
  }
}

function dispatchMemberEvent(
  event: SlackEvent,
  context: EventHandlerContext
): EventHandlerResult {
  if (event.type === "member_joined_channel") {
    return handleMemberJoinedEvent(event, context);
  }
  return handleMemberLeftEvent(event as MemberLeftChannelEvent, context);
}

export async function handleSlackEvent(
  event: SlackEvent,
  context: EventHandlerContext
): Promise<EventHandlerResult> {
  try {
    if (isMessageEvent(event)) {
      return await dispatchMessageEvent(event, context);
    }
    if (isReactionEvent(event)) {
      return await dispatchReactionEvent(event, context);
    }
    if (isChannelEvent(event)) {
      return dispatchChannelEvent(event, context);
    }
    if (isMemberEvent(event)) {
      return dispatchMemberEvent(event, context);
    }
    if (isBookmarkEvent(event)) {
      return dispatchBookmarkEvent(event, context);
    }
    if (isFileEvent(event)) {
      return dispatchFileEvent(event, context);
    }
    return { changes: [], errors: [] };
  } catch (error) {
    return {
      changes: [],
      errors: [error instanceof Error ? error : new Error(String(error))],
    };
  }
}

function dispatchBookmarkEvent(
  event: SlackEvent,
  context: EventHandlerContext
): EventHandlerResult {
  if (event.type === "bookmark_added") {
    return handleBookmarkAddedEvent(event as BookmarkAddedEvent, context);
  }
  return handleBookmarkDeletedEvent(event as BookmarkDeletedEvent, context);
}

function dispatchFileEvent(
  event: SlackEvent,
  context: EventHandlerContext
): Promise<EventHandlerResult> | EventHandlerResult {
  if (event.type === "file_shared") {
    return handleFileSharedEvent(event as FileSharedEvent, context);
  }
  return handleFileDeletedEvent(event as FileDeletedEvent, context);
}

async function handleMessageEvent(
  event: MessageEvent,
  context: EventHandlerContext
): Promise<EventHandlerResult> {
  const { client, channelCache, memberCache } = context;

  if (shouldSkipMessage(event)) {
    return { changes: [], errors: [] };
  }

  const channel = await getChannelFromCache(
    client,
    event.channel,
    channelCache
  );

  if (!channel) {
    return { changes: [], errors: [] };
  }

  let channelMembers: string[] | undefined;
  if (channel.is_private) {
    channelMembers = await getMembersFromCache(client, channel.id, memberCache);
  }

  const transformContext: MessageTransformContext = {
    ...context,
    channel,
    channelMembers,
  };

  const message = eventToMessage(event);
  const document = transformMessage(message, transformContext);

  return {
    changes: [{ operation: "create", document }],
    errors: [],
  };
}

async function handleMessageChangedEvent(
  event: MessageChangedEvent,
  context: EventHandlerContext
): Promise<EventHandlerResult> {
  const { client, channelCache, memberCache } = context;

  const channel = await getChannelFromCache(
    client,
    event.channel,
    channelCache
  );

  if (!channel) {
    return { changes: [], errors: [] };
  }

  let channelMembers: string[] | undefined;
  if (channel.is_private) {
    channelMembers = await getMembersFromCache(client, channel.id, memberCache);
  }

  const transformContext: MessageTransformContext = {
    ...context,
    channel,
    channelMembers,
  };

  const message: SlackMessage = {
    ts: event.message.ts,
    text: event.message.text,
    user: event.message.user,
    thread_ts: event.message.thread_ts,
    edited: event.message.edited,
  };

  const document = transformMessage(message, transformContext);

  return {
    changes: [{ operation: "update", document }],
    errors: [],
  };
}

function handleMessageDeletedEvent(
  event: MessageDeletedEvent,
  context: TransformContext
): EventHandlerResult {
  const documentId = `${context.connectorId}_${event.channel}_${event.deleted_ts}`;

  return {
    changes: [{ operation: "delete", documentId }],
    errors: [],
  };
}

async function handleReactionEvent(
  event: ReactionAddedEvent | ReactionRemovedEvent,
  context: EventHandlerContext
): Promise<EventHandlerResult> {
  const { client, channelCache, memberCache } = context;

  if (event.item.type !== "message") {
    return { changes: [], errors: [] };
  }

  const channelId = event.item.channel;
  const messageTs = event.item.ts;

  if (!(channelId && messageTs)) {
    return { changes: [], errors: [] };
  }

  const message = await fetchSingleMessage(client, channelId, messageTs);
  if (!message) {
    return { changes: [], errors: [] };
  }

  const channel = await getChannelFromCache(client, channelId, channelCache);
  if (!channel) {
    return { changes: [], errors: [] };
  }

  let channelMembers: string[] | undefined;
  if (channel.is_private) {
    channelMembers = await getMembersFromCache(client, channel.id, memberCache);
  }

  const transformContext: MessageTransformContext = {
    ...context,
    channel,
    channelMembers,
  };

  const document = transformMessage(message, transformContext);

  return {
    changes: [{ operation: "update", document }],
    errors: [],
  };
}

function handleReactionAddedEvent(
  event: ReactionAddedEvent,
  context: EventHandlerContext
): Promise<EventHandlerResult> {
  return handleReactionEvent(event, context);
}

function handleReactionRemovedEvent(
  event: ReactionRemovedEvent,
  context: EventHandlerContext
): Promise<EventHandlerResult> {
  return handleReactionEvent(event, context);
}

function handleChannelCreatedEvent(
  _event: ChannelCreatedEvent,
  _context: EventHandlerContext
): EventHandlerResult {
  return { changes: [], errors: [] };
}

function handleChannelRenameEvent(
  _event: ChannelRenameEvent,
  _context: EventHandlerContext
): EventHandlerResult {
  return { changes: [], errors: [] };
}

function handleChannelArchiveEvent(
  _event: ChannelArchiveEvent,
  _context: EventHandlerContext
): EventHandlerResult {
  return { changes: [], errors: [] };
}

function handleChannelUnarchiveEvent(
  _event: ChannelUnarchiveEvent,
  _context: EventHandlerContext
): EventHandlerResult {
  return { changes: [], errors: [] };
}

function handleChannelDeletedEvent(
  event: ChannelDeletedEvent,
  _context: TransformContext
): EventHandlerResult {
  return {
    changes: [
      {
        operation: "delete",
        documentId: `channel:${event.channel}`,
      },
    ],
    errors: [],
  };
}

function handleMemberJoinedEvent(
  event: MemberJoinedChannelEvent,
  context: EventHandlerContext
): EventHandlerResult {
  const { memberCache } = context;

  if (memberCache) {
    memberCache.delete(event.channel);
  }

  return {
    changes: [
      {
        operation: "permission_update",
        permissionUpdate: {
          channelId: event.channel,
          userId: event.user,
          action: "add",
        },
      },
    ],
    errors: [],
  };
}

function handleMemberLeftEvent(
  event: MemberLeftChannelEvent,
  context: EventHandlerContext
): EventHandlerResult {
  const { memberCache } = context;

  if (memberCache) {
    memberCache.delete(event.channel);
  }

  return {
    changes: [
      {
        operation: "permission_update",
        permissionUpdate: {
          channelId: event.channel,
          userId: event.user,
          action: "remove",
        },
      },
    ],
    errors: [],
  };
}

function shouldSkipMessage(event: MessageEvent): boolean {
  const skipSubtypes = [
    "channel_join",
    "channel_leave",
    "channel_topic",
    "channel_purpose",
    "channel_name",
    "bot_message",
  ];

  if (event.subtype && skipSubtypes.includes(event.subtype)) {
    return true;
  }

  if (!(event.text || event.files?.length || event.attachments?.length)) {
    return true;
  }

  return false;
}

function eventToMessage(event: MessageEvent): SlackMessage {
  return {
    ts: event.ts,
    text: event.text,
    user: event.user,
    bot_id: event.bot_id,
    thread_ts: event.thread_ts,
    files: event.files as SlackMessage["files"],
    blocks: event.blocks as SlackMessage["blocks"],
    attachments: event.attachments,
    edited: event.edited,
  };
}

async function getChannelFromCache(
  client: SlackClient,
  channelId: string,
  cache?: Map<string, SlackChannel>
): Promise<SlackChannel | null> {
  if (cache?.has(channelId)) {
    return cache.get(channelId) ?? null;
  }

  const channel = await getChannelInfo(client, channelId);

  if (channel && cache) {
    cache.set(channelId, channel);
  }

  return channel;
}

async function getMembersFromCache(
  client: SlackClient,
  channelId: string,
  cache?: Map<string, string[]>
): Promise<string[]> {
  if (cache?.has(channelId)) {
    return cache.get(channelId) ?? [];
  }

  const members = await getAllChannelMembers(client, channelId);

  if (cache) {
    cache.set(channelId, members);
  }

  return members;
}

function handleBookmarkAddedEvent(
  event: BookmarkAddedEvent,
  context: EventHandlerContext
): EventHandlerResult {
  const { bookmark } = event;

  const transformContext: BookmarkTransformContext = {
    ...context,
  };

  const doc = transformBookmark(
    {
      id: bookmark.id,
      channelId: bookmark.channel_id,
      title: bookmark.title,
      link: bookmark.link,
      emoji: bookmark.emoji,
      iconUrl: bookmark.icon_url,
      type: bookmark.type as SlackBookmarkType,
      entityId: bookmark.entity_id,
      createdBy: bookmark.created_by ?? "",
      createdAt: bookmark.date_created * 1000,
      updatedAt: bookmark.date_updated
        ? bookmark.date_updated * 1000
        : undefined,
    },
    transformContext
  );

  return {
    changes: [{ operation: "create", document: doc }],
    errors: [],
  };
}

function handleBookmarkDeletedEvent(
  event: BookmarkDeletedEvent,
  context: TransformContext
): EventHandlerResult {
  const documentId = `${context.connectorId}_bookmark_${event.bookmark_id}`;

  return {
    changes: [{ operation: "delete", documentId }],
    errors: [],
  };
}

async function handleFileSharedEvent(
  event: FileSharedEvent,
  context: EventHandlerContext
): Promise<EventHandlerResult> {
  const { client } = context;
  const { file_id: fileId, channel_id: channelId } = event;

  const clipInfo = await getClipInfo(client, fileId);
  if (!clipInfo) {
    return { changes: [], errors: [] };
  }

  const transformContext: ClipTransformContext = {
    ...context,
  };

  const doc = transformClip(
    {
      id: clipInfo.id,
      title: clipInfo.title,
      channelId: channelId ?? clipInfo.channelId,
      userId: clipInfo.userId,
      duration: clipInfo.duration,
      transcript: clipInfo.transcript,
      thumbnailUrl: clipInfo.thumbnailUrl,
      videoUrl: clipInfo.videoUrl,
      createdAt: clipInfo.createdAt,
      viewCount: clipInfo.viewCount,
    },
    transformContext
  );

  return {
    changes: [{ operation: "create", document: doc }],
    errors: [],
  };
}

function handleFileDeletedEvent(
  event: FileDeletedEvent,
  context: TransformContext
): EventHandlerResult {
  const documentId = `${context.connectorId}_clip_${event.file_id}`;

  return {
    changes: [{ operation: "delete", documentId }],
    errors: [],
  };
}

export async function handleSlackEventBatch(
  events: SlackEvent[],
  context: EventHandlerContext
): Promise<EventHandlerResult> {
  const allChanges: DocumentChange[] = [];
  const allErrors: Error[] = [];

  for (const event of events) {
    const result = await handleSlackEvent(event, context);
    allChanges.push(...result.changes);
    allErrors.push(...result.errors);
  }

  const changeMap = new Map<string, DocumentChange>();

  for (const change of allChanges) {
    const key = change.documentId ?? change.document?.id ?? change.entityId;
    if (key) {
      changeMap.set(key, change);
    }
  }

  return {
    changes: Array.from(changeMap.values()),
    errors: allErrors,
  };
}
