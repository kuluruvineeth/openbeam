import type { OutlookTransformContext } from "@openbeam/types/services/connectors/outlook";
import type { GenericDocument } from "@openbeam/vespa";

export type OutlookMessage = {
  id: string;
  subject: string;
  bodyPreview: string;
  body: { contentType: string; content: string };
  from?: { emailAddress: { name?: string; address: string } };
  toRecipients?: Array<{ emailAddress: { name?: string; address: string } }>;
  ccRecipients?: Array<{ emailAddress: { name?: string; address: string } }>;
  receivedDateTime: string;
  sentDateTime?: string;
  lastModifiedDateTime?: string;
  webLink: string;
  importance: string;
  hasAttachments: boolean;
  isRead: boolean;
  conversationId: string;
  parentFolderId?: string;
  "@removed"?: { reason: string };
};

function stripHtml(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

function extractEmails(
  recipients?: Array<{ emailAddress: { name?: string; address: string } }>
): string[] {
  if (!recipients || recipients.length === 0) {
    return [];
  }
  return recipients.map((r) => r.emailAddress.address);
}

export function transformOutlookMessage(
  message: OutlookMessage,
  context: OutlookTransformContext
): GenericDocument {
  const plainText =
    message.body.contentType === "html"
      ? stripHtml(message.body.content)
      : message.body.content;

  const fromEmail = message.from?.emailAddress.address;
  const fromName = message.from?.emailAddress.name;
  const createdAt = new Date(message.receivedDateTime).getTime();
  const updatedAt = message.lastModifiedDateTime
    ? new Date(message.lastModifiedDateTime).getTime()
    : createdAt;

  const toAddresses = extractEmails(message.toRecipients);
  const ccAddresses = extractEmails(message.ccRecipients);

  const participants = [fromEmail, ...toAddresses, ...ccAddresses].filter(
    Boolean
  ) as string[];

  return {
    id: `${context.connectorId}_email_${message.id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: message.id,
    document_type: "email",
    document_subtype: "email",
    title: message.subject || "(No Subject)",
    content: plainText,
    content_html:
      message.body.contentType === "html" ? message.body.content : undefined,
    author_id: fromEmail,
    author_email: fromEmail,
    author_name: fromName ?? fromEmail,
    created_at: createdAt,
    updated_at: updatedAt,
    source_id: message.conversationId,
    source_type: "thread",
    thread_id: message.conversationId,
    url: message.webLink,
    is_public: false,
    access_control: participants,
    metadata: {
      importance: message.importance,
      hasAttachments: message.hasAttachments,
      isRead: message.isRead,
      conversationId: message.conversationId,
      ...(toAddresses.length > 0 && { to: toAddresses.join(", ") }),
      ...(ccAddresses.length > 0 && { cc: ccAddresses.join(", ") }),
    },
  };
}
