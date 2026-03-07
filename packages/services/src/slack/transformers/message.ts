import type {
  SlackChannel,
  SlackMessage,
  TransformContext,
} from "@openbeam/types/services/connectors/slack";
import type { GenericDocument, JsonArray, JsonObject } from "@openbeam/vespa";
import { calculateDocumentChecksum } from "../../lib/checksum";
import { slackTsToMs } from "../api/messages";
import type { UserLookup } from "../api/users";

export interface MessageTransformContext extends TransformContext {
  channel: SlackChannel;
  userLookup?: UserLookup;
  channelMembers?: string[];
}

export interface MessageTransformOptions {
  includeBlocks?: boolean;
  includeAttachments?: boolean;
  includeReactions?: boolean;
}

export async function transformMessage(
  message: SlackMessage,
  context: MessageTransformContext,
  options: MessageTransformOptions = {}
): Promise<GenericDocument> {
  const {
    connectorId,
    connectorType,
    teamId,
    workspaceId,
    channel,
    userLookup,
    channelMembers,
  } = context;

  const {
    includeBlocks = false,
    includeAttachments = true,
    includeReactions = true,
  } = options;

  const createdAt = slackTsToMs(message.ts);
  const updatedAt = message.edited ? slackTsToMs(message.edited.ts) : createdAt;

  const authorId = message.user ?? message.bot_id;
  const authorName = authorId ? userLookup?.getName(authorId) : undefined;
  const authorAvatarUrl = authorId
    ? userLookup?.getAvatar(authorId)
    : undefined;

  const isReply = Boolean(
    message.thread_ts && message.thread_ts !== message.ts
  );
  const threadId = message.thread_ts ?? message.ts;
  const parentId = isReply ? message.thread_ts : undefined;

  const documentId = `${connectorId}_${channel.id}_${message.ts}`;

  const url = buildMessageUrl(channel.id, message.ts, message.thread_ts);

  const metadata = buildMetadata(message, {
    includeBlocks,
    includeAttachments,
    includeReactions,
  });

  const title = buildTitle(channel, message, isReply);
  const content = message.text ?? "";

  const checksum = await calculateDocumentChecksum({
    title,
    content,
    metadata,
  });

  const accessControl = channel.is_private ? channelMembers : undefined;

  return {
    id: documentId,
    connector_id: connectorId,
    connector_type: connectorType,
    team_id: teamId,
    workspace_id: workspaceId,
    external_id: message.ts,
    document_type: "message",
    title,
    content,
    author_id: authorId,
    author_name: authorName,
    author_avatar_url: authorAvatarUrl,
    created_at: createdAt,
    updated_at: updatedAt,
    source_id: channel.id,
    source_name: channel.name,
    source_type: "channel",
    parent_id: parentId,
    thread_id: threadId,
    reaction_count: countReactions(message),
    reply_count: message.reply_count ?? 0,
    metadata,
    checksum,
    url,
    is_public: !channel.is_private,
    access_control: accessControl,
  };
}

export function transformMessages(
  messages: SlackMessage[],
  context: MessageTransformContext,
  options: MessageTransformOptions = {}
): Promise<GenericDocument[]> {
  return Promise.all(
    messages.map((message) => transformMessage(message, context, options))
  );
}

function buildTitle(
  channel: SlackChannel,
  message: SlackMessage,
  isReply: boolean
): string {
  if (isReply) {
    return `Reply in #${channel.name}`;
  }

  if (message.reply_count && message.reply_count > 0) {
    return `Thread in #${channel.name}`;
  }

  return `Message in #${channel.name}`;
}

function buildMessageUrl(
  channelId: string,
  ts: string,
  threadTs?: string
): string {
  const tsUrl = ts.replace(".", "");
  const baseUrl = `https://slack.com/archives/${channelId}/p${tsUrl}`;

  if (threadTs && threadTs !== ts) {
    const threadTsUrl = threadTs.replace(".", "");
    return `${baseUrl}?thread_ts=${threadTsUrl}&cid=${channelId}`;
  }

  return baseUrl;
}

function buildMetadata(
  message: SlackMessage,
  options: {
    includeBlocks: boolean;
    includeAttachments: boolean;
    includeReactions: boolean;
  }
): JsonObject {
  const metadata: JsonObject = {};

  if (message.subtype) {
    metadata.subtype = message.subtype;
  }

  if (options.includeReactions && message.reactions) {
    metadata.reactions = message.reactions.map((r) => ({
      name: r.name,
      count: r.count,
    })) as JsonArray;
  }

  if (message.files && message.files.length > 0) {
    metadata.files = message.files.map((f) => ({
      id: f.id,
      name: f.name,
      mimetype: f.mimetype,
      size: f.size ?? 0,
    })) as JsonArray;
  }

  if (options.includeBlocks && message.blocks) {
    metadata.blocks = message.blocks as JsonArray;
  }

  if (options.includeAttachments && message.attachments) {
    metadata.attachments = message.attachments as JsonArray;
  }

  if (message.edited) {
    metadata.edited = {
      user: message.edited.user,
      ts: message.edited.ts,
    };
  }

  return metadata;
}

function countReactions(message: SlackMessage): number {
  if (!message.reactions) {
    return 0;
  }

  return message.reactions.reduce((sum, reaction) => sum + reaction.count, 0);
}

export function extractMentions(text: string): string[] {
  const mentionRegex = /<@([A-Z0-9]+)>/g;
  const matches = text.matchAll(mentionRegex);
  return Array.from(matches, (m) => m[1]).filter(Boolean) as string[];
}

export function extractChannelRefs(text: string): string[] {
  const channelRegex = /<#([A-Z0-9]+)\|[^>]+>/g;
  const matches = text.matchAll(channelRegex);
  return Array.from(matches, (m) => m[1]).filter(Boolean) as string[];
}

export function extractUrls(text: string): string[] {
  const urlRegex = /<(https?:\/\/[^|>]+)(?:\|[^>]+)?>/g;
  const matches = text.matchAll(urlRegex);
  return Array.from(matches, (m) => m[1]).filter(Boolean) as string[];
}

export function cleanMessageText(text: string): string {
  return text
    .replace(/<@[A-Z0-9]+>/g, "@user")
    .replace(/<#[A-Z0-9]+\|([^>]+)>/g, "#$1")
    .replace(/<(https?:\/\/[^|>]+)(?:\|[^>]+)?>/g, "$1")
    .replace(/<!([^>]+)>/g, "@$1");
}
