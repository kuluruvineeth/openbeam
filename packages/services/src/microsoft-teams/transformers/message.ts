import type { TeamsTransformContext } from "@openbeam/types/services/connectors/teams";
import type { GenericDocument } from "@openbeam/vespa";

type TeamsMessage = {
  id: string;
  messageType: string;
  createdDateTime: string;
  lastModifiedDateTime?: string;
  subject?: string;
  body: { contentType: string; content: string };
  from?: { user?: { displayName?: string; id?: string } };
  webUrl?: string;
  importance?: string;
  attachments?: Array<{
    id: string;
    name?: string;
    contentType?: string;
    contentUrl?: string;
  }>;
};

type TransformOptions = {
  teamName: string;
  channelName: string;
  teamId: string;
  channelId: string;
  parentMessageId?: string;
};

function extractMentionText(html: string): string {
  return html.replace(/<at[^>]*>([\s\S]*?)<\/at>/gi, "$1");
}

function stripHtml(html: string): string {
  const withMentions = extractMentionText(html);
  return withMentions
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

export function transformTeamsMessage(
  message: TeamsMessage,
  context: TeamsTransformContext,
  options: TransformOptions
): GenericDocument {
  const plainText =
    message.body.contentType === "html"
      ? stripHtml(message.body.content)
      : message.body.content;

  const createdAt = new Date(message.createdDateTime).getTime();
  const updatedAt = message.lastModifiedDateTime
    ? new Date(message.lastModifiedDateTime).getTime()
    : createdAt;

  const authorName = message.from?.user?.displayName;
  const authorId = message.from?.user?.id;
  const preview = plainText.slice(0, 100);
  const channelLabel = options.channelName || options.channelId;
  const title = message.subject || `#${channelLabel}: ${preview}`;
  const threadId = options.parentMessageId ?? message.id;

  return {
    id: `${context.connectorId}_message_${message.id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: message.id,
    document_type: "message",
    document_subtype: options.parentMessageId ? "reply" : "message",
    title,
    content: plainText,
    content_html:
      message.body.contentType === "html" ? message.body.content : undefined,
    author_id: authorId,
    author_name: authorName,
    created_at: createdAt,
    updated_at: updatedAt,
    source_id: `${options.teamId}:${options.channelId}`,
    source_type: "channel",
    source_name: options.channelName || undefined,
    thread_id: threadId,
    parent_id: options.parentMessageId
      ? `${context.connectorId}_message_${options.parentMessageId}`
      : undefined,
    url: message.webUrl,
    is_public: false,
    metadata: {
      teamId: options.teamId,
      teamName: options.teamName,
      channelId: options.channelId,
      channelName: options.channelName,
      importance: message.importance ?? "normal",
      hasAttachments: (message.attachments?.length ?? 0) > 0,
      attachmentCount: message.attachments?.length ?? 0,
    },
  };
}
