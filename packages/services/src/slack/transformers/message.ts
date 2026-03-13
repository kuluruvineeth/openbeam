import type {
  SlackBlock,
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

const TITLE_MAX_LENGTH = 120;

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

  const content = extractMessageContent(message);
  const title = buildTitle(channel, message, isReply, content);

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

function extractMessageContent(message: SlackMessage): string {
  if (message.text && message.text.trim().length > 0) {
    return message.text;
  }

  if (message.blocks && message.blocks.length > 0) {
    const blockText = extractTextFromBlocks(message.blocks);
    if (blockText.length > 0) {
      return blockText;
    }
  }

  if (message.attachments && message.attachments.length > 0) {
    const attachmentText = extractTextFromAttachments(message.attachments);
    if (attachmentText.length > 0) {
      return attachmentText;
    }
  }

  if (message.files && message.files.length > 0) {
    const fileNames = message.files
      .map((f) => f.title ?? f.name)
      .filter(Boolean);
    if (fileNames.length > 0) {
      return `Shared: ${fileNames.join(", ")}`;
    }
  }

  return "";
}

function extractTextFromBlocks(blocks: SlackBlock[]): string {
  const parts: string[] = [];

  for (const block of blocks) {
    const blockType = block.type;

    if (blockType === "rich_text" && Array.isArray(block.elements)) {
      parts.push(extractTextFromRichTextElements(block.elements));
    } else if (
      (blockType === "section" || blockType === "header") &&
      block.text &&
      typeof block.text === "object"
    ) {
      const textObj = block.text as Record<string, unknown>;
      if (typeof textObj.text === "string") {
        parts.push(textObj.text);
      }
    } else if (blockType === "context" && Array.isArray(block.elements)) {
      for (const el of block.elements) {
        if (el && typeof el === "object") {
          const obj = el as Record<string, unknown>;
          if (typeof obj.text === "string") {
            parts.push(obj.text);
          }
        }
      }
    }
  }

  return parts.filter(Boolean).join("\n");
}

function extractTextFromRichTextElements(elements: unknown[]): string {
  const parts: string[] = [];

  for (const section of elements) {
    if (!section || typeof section !== "object") {
      continue;
    }

    const sectionObj = section as Record<string, unknown>;
    const sectionType = sectionObj.type;

    if (
      (sectionType === "rich_text_section" ||
        sectionType === "rich_text_quote" ||
        sectionType === "rich_text_preformatted" ||
        sectionType === "rich_text_list") &&
      Array.isArray(sectionObj.elements)
    ) {
      for (const el of sectionObj.elements) {
        if (!el || typeof el !== "object") {
          continue;
        }

        const elObj = el as Record<string, unknown>;

        if (elObj.type === "text" && typeof elObj.text === "string") {
          parts.push(elObj.text);
        } else if (elObj.type === "link" && typeof elObj.url === "string") {
          const label = typeof elObj.text === "string" ? elObj.text : elObj.url;
          parts.push(label);
        } else if (elObj.type === "emoji" && typeof elObj.name === "string") {
          parts.push(`:${elObj.name}:`);
        } else if (
          elObj.type === "channel" &&
          typeof elObj.channel_id === "string"
        ) {
          parts.push(`#${elObj.channel_id}`);
        } else if (elObj.type === "user" && typeof elObj.user_id === "string") {
          parts.push(`@${elObj.user_id}`);
        } else if (
          sectionType === "rich_text_list" &&
          Array.isArray(elObj.elements)
        ) {
          parts.push(extractTextFromRichTextElements([elObj]));
        }
      }
    }
  }

  return parts.join("");
}

function extractTextFromAttachments(attachments: unknown[]): string {
  const parts: string[] = [];

  for (const attachment of attachments) {
    if (!attachment || typeof attachment !== "object") {
      continue;
    }

    const att = attachment as Record<string, unknown>;

    if (typeof att.text === "string" && att.text.length > 0) {
      parts.push(att.text);
    } else if (typeof att.fallback === "string" && att.fallback.length > 0) {
      parts.push(att.fallback);
    } else if (typeof att.pretext === "string" && att.pretext.length > 0) {
      parts.push(att.pretext);
    }

    if (typeof att.title === "string" && att.title.length > 0) {
      parts.push(att.title);
    }
  }

  return parts.join("\n");
}

function truncateToTitle(text: string, maxLength: number): string {
  const firstLine = text.split("\n")[0] ?? text;
  const cleaned = cleanMessageText(firstLine).trim();

  if (cleaned.length <= maxLength) {
    return cleaned;
  }

  return `${cleaned.slice(0, maxLength - 1)}…`;
}

function buildTitle(
  channel: SlackChannel,
  message: SlackMessage,
  isReply: boolean,
  content: string
): string {
  let prefix = `#${channel.name}`;
  if (!isReply && message.reply_count && message.reply_count > 0) {
    prefix = `#${channel.name} thread`;
  }

  if (content.length > 0) {
    const preview = truncateToTitle(
      content,
      TITLE_MAX_LENGTH - prefix.length - 3
    );
    if (preview.length > 0) {
      return `${prefix}: ${preview}`;
    }
  }

  if (message.files && message.files.length > 0) {
    const fileName = message.files[0]?.title ?? message.files[0]?.name;
    if (fileName) {
      return `${prefix}: ${fileName}`;
    }
  }

  return prefix;
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
