import type { GoogleChatTransformContext } from "@openbeam/types/services/connectors/google-chat";
import type { GenericDocument } from "@openbeam/vespa";
import type { ChatMessage } from "../client";

const SPACE_ID_RE = /spaces\/([^/]+)/;

function extractMessageId(name: string): string {
  return name.split("/").at(-1) ?? name;
}

function extractSpaceId(name: string): string {
  const match = name.match(SPACE_ID_RE);
  return match?.[1] ?? name;
}

function buildMessageContent(message: ChatMessage): string {
  const parts: string[] = [];

  if (message.text) {
    parts.push(message.text);
  }

  if (message.attachment?.length) {
    const names = message.attachment
      .map((a) => a.contentName)
      .filter(Boolean)
      .slice(0, 10);
    if (names.length > 0) {
      parts.push(`Attachments: ${names.join(", ")}`);
    }
  }

  return parts.join("\n");
}

export function transformMessage(
  message: ChatMessage,
  context: GoogleChatTransformContext,
  spaceName?: string
): GenericDocument {
  const messageId = extractMessageId(message.name);
  const spaceId = message.space?.name ? extractSpaceId(message.space.name) : "";

  const content = buildMessageContent(message);
  const createdAt = new Date(message.createTime).getTime();
  const updatedAt = message.lastUpdateTime
    ? new Date(message.lastUpdateTime).getTime()
    : createdAt;

  const threadName = message.thread?.name;
  const threadId = threadName ? extractMessageId(threadName) : undefined;

  return {
    id: `${context.connectorId}_message_${messageId}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: messageId,
    document_type: "message",
    document_subtype: "chat_message",
    title: content.slice(0, 120) || "(empty message)",
    content,
    author_name: message.sender.displayName,
    created_at: createdAt,
    updated_at: updatedAt,
    url: `https://chat.google.com/room/${spaceId}/${messageId}`,
    is_public: false,
    metadata: {
      ...(spaceId && { spaceId }),
      ...(spaceName && { spaceName }),
      ...(threadId && threadId !== messageId && { threadId }),
      senderType: message.sender.type,
      ...(message.attachment?.length && {
        attachmentCount: message.attachment.length,
      }),
      ...(message.emojiReactionSummaries?.length && {
        reactionCount: message.emojiReactionSummaries.reduce(
          (sum, r) => sum + (r.reactionCount ?? 0),
          0
        ),
      }),
    },
  };
}
