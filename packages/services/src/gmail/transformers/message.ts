import type {
  GmailMessage,
  GmailTransformContext,
} from "@openplane/types/services/connectors/gmail";
import type { GenericDocument } from "@openplane/vespa";
import type { LabelLookup } from "../api/labels";
import {
  buildEmailUrl,
  extractContent,
  extractEmailAddress,
  extractSenderName,
  getAllParticipants,
  getInternalDateMs,
  getPlainTextContent,
  parseHeaders,
} from "../utils/content-extractor";

export interface MessageTransformOptions {
  labelLookup?: LabelLookup;
  isReply?: boolean;
  parentMessageId?: string;
}

export function transformMessage(
  message: GmailMessage,
  context: GmailTransformContext,
  options: MessageTransformOptions = {}
): GenericDocument {
  const { labelLookup, isReply = false, parentMessageId } = options;
  const headers = parseHeaders(message);
  const content = extractContent(message);
  const plainText = getPlainTextContent(content);

  const createdAt = getInternalDateMs(message);
  const authorEmail = headers.from
    ? extractEmailAddress(headers.from)
    : undefined;
  const authorName = headers.from ? extractSenderName(headers.from) : undefined;

  const labelNames =
    message.labelIds
      ?.map((id) => labelLookup?.getName(id) ?? id)
      .filter(Boolean) ?? [];

  const participants = getAllParticipants(headers);

  const title = buildEmailTitle(headers.subject, isReply);

  return {
    id: buildDocumentId(context.connectorId, message.id),
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: message.id,
    document_type: "email",
    document_subtype: isReply ? "reply" : "email",
    title,
    content: plainText,
    content_html: content.html,
    author_id: authorEmail,
    author_email: authorEmail,
    author_name: authorName ?? authorEmail,
    created_at: createdAt,
    updated_at: createdAt,
    source_id: message.threadId,
    source_type: "thread",
    parent_id: parentMessageId,
    thread_id: message.threadId,
    labels: labelNames,
    url: buildEmailUrl(message.id),
    is_public: false,
    access_control: participants,
    attachments: content.attachments.map((a) => a.filename),
    metadata: {
      ...(headers.messageId && { messageId: headers.messageId }),
      ...(headers.inReplyTo && { inReplyTo: headers.inReplyTo }),
      ...(headers.references && { references: headers.references }),
      ...(headers.to && { to: headers.to }),
      ...(headers.cc && { cc: headers.cc }),
      ...(message.labelIds && { resourceExternalIds: message.labelIds }),
      ...(message.snippet && { snippet: message.snippet }),
      ...(message.historyId && { historyId: message.historyId }),
      ...(message.sizeEstimate !== undefined && {
        sizeEstimate: message.sizeEstimate,
      }),
      hasAttachments: content.attachments.length > 0,
      hasMedia: content.media.length > 0,
      attachmentCount: content.attachments.length,
      mediaCount: content.media.length,
    },
  };
}

function buildDocumentId(connectorId: string, messageId: string): string {
  return `${connectorId}_email_${messageId}`;
}

function buildEmailTitle(
  subject: string | undefined,
  isReply: boolean
): string {
  if (!subject) {
    return isReply ? "Reply (No Subject)" : "Email (No Subject)";
  }
  return subject;
}

export function transformMessages(
  messages: GmailMessage[],
  context: GmailTransformContext,
  options: MessageTransformOptions = {}
): GenericDocument[] {
  return messages.map((message) => transformMessage(message, context, options));
}

export function isReplyMessage(message: GmailMessage): boolean {
  const headers = parseHeaders(message);
  return Boolean(headers.inReplyTo || headers.references?.length);
}

export function getMessagePosition(
  message: GmailMessage,
  threadMessages: GmailMessage[]
): number {
  const sorted = [...threadMessages].sort((a, b) => {
    const aTime = getInternalDateMs(a);
    const bTime = getInternalDateMs(b);
    return aTime - bTime;
  });

  return sorted.findIndex((m) => m.id === message.id);
}
