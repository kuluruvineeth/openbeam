import type {
  GmailMessage,
  GmailThread,
  GmailTransformContext,
} from "@openplane/types/services/connectors/gmail";
import type { GenericDocument } from "@openplane/vespa";
import type { LabelLookup } from "../api/labels";
import {
  buildThreadUrl,
  extractContent,
  extractEmailAddress,
  extractSenderName,
  getInternalDateMs,
  getPlainTextContent,
  parseHeaders,
} from "../utils/content-extractor";
import { transformMessage } from "./message";

export interface ThreadTransformOptions {
  labelLookup?: LabelLookup;
  includeAllMessages?: boolean;
}

export interface ThreadTransformResult {
  threadDocument: GenericDocument;
  messageDocuments: GenericDocument[];
}

export function transformThread(
  thread: GmailThread,
  context: GmailTransformContext,
  options: ThreadTransformOptions = {}
): ThreadTransformResult {
  const { labelLookup, includeAllMessages = true } = options;
  const messages = thread.messages ?? [];

  if (messages.length === 0) {
    return {
      threadDocument: createEmptyThreadDocument(thread, context),
      messageDocuments: [],
    };
  }

  const firstMessage = messages[0] as GmailMessage;
  const lastMessage = messages.at(-1) as GmailMessage;

  const firstHeaders = parseHeaders(firstMessage);
  const firstContent = extractContent(firstMessage);

  const authorEmail = firstHeaders.from
    ? extractEmailAddress(firstHeaders.from)
    : undefined;
  const authorName = firstHeaders.from
    ? extractSenderName(firstHeaders.from)
    : undefined;

  const participants = collectThreadParticipants(messages);
  const labelInfo = collectThreadLabels(messages, labelLookup);
  const totalAttachments = countThreadAttachments(messages);

  const createdAt = getInternalDateMs(firstMessage);
  const updatedAt = getInternalDateMs(lastMessage);

  const threadContent = buildThreadContent(messages);

  const threadDocument: GenericDocument = {
    id: buildThreadDocumentId(context.connectorId, thread.id),
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: thread.id,
    document_type: "thread",
    title: firstHeaders.subject ?? "Thread (No Subject)",
    content: threadContent,
    content_html: firstContent.html,
    author_id: authorEmail,
    author_email: authorEmail,
    author_name: authorName ?? authorEmail,
    created_at: createdAt,
    updated_at: updatedAt,
    source_id: thread.id,
    source_type: "gmail",
    thread_id: thread.id,
    reply_count: messages.length - 1,
    labels: labelInfo.names,
    url: buildThreadUrl(thread.id),
    is_public: false,
    access_control: participants,
    contributor_ids: participants,
    metadata: {
      ...(thread.historyId && { historyId: thread.historyId }),
      messageCount: messages.length,
      participants,
      hasAttachments: totalAttachments > 0,
      attachmentCount: totalAttachments,
      resourceExternalIds: labelInfo.ids,
      ...((thread.snippet ?? firstMessage.snippet) && {
        snippet: thread.snippet ?? firstMessage.snippet,
      }),
    },
  };

  let messageDocuments: GenericDocument[] = [];

  if (includeAllMessages) {
    messageDocuments = messages.map((message, index) => {
      const isReply = index > 0;
      const parentMessageId = isReply ? messages[index - 1]?.id : undefined;

      return transformMessage(message, context, {
        labelLookup,
        isReply,
        parentMessageId,
      });
    });
  }

  return { threadDocument, messageDocuments };
}

function buildThreadDocumentId(connectorId: string, threadId: string): string {
  return `${connectorId}_thread_${threadId}`;
}

function createEmptyThreadDocument(
  thread: GmailThread,
  context: GmailTransformContext
): GenericDocument {
  const now = Date.now();

  return {
    id: buildThreadDocumentId(context.connectorId, thread.id),
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: thread.id,
    document_type: "thread",
    title: "Empty Thread",
    content: thread.snippet ?? "",
    created_at: now,
    updated_at: now,
    source_id: thread.id,
    source_type: "gmail",
    thread_id: thread.id,
    reply_count: 0,
    url: buildThreadUrl(thread.id),
    is_public: false,
    metadata: {
      ...(thread.historyId && { historyId: thread.historyId }),
      messageCount: 0,
    },
  };
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: iterating headers for each message
function collectThreadParticipants(messages: GmailMessage[]): string[] {
  const participants = new Set<string>();

  for (const message of messages) {
    const headers = parseHeaders(message);

    if (headers.from) {
      const email = extractEmailAddress(headers.from);
      if (email) {
        participants.add(email);
      }
    }

    for (const addr of headers.to ?? []) {
      const email = extractEmailAddress(addr);
      if (email) {
        participants.add(email);
      }
    }

    for (const addr of headers.cc ?? []) {
      const email = extractEmailAddress(addr);
      if (email) {
        participants.add(email);
      }
    }
  }

  return Array.from(participants);
}

interface ThreadLabelInfo {
  names: string[];
  ids: string[];
}

function collectThreadLabels(
  messages: GmailMessage[],
  labelLookup?: LabelLookup
): ThreadLabelInfo {
  const labelNames = new Set<string>();
  const labelIds = new Set<string>();

  for (const message of messages) {
    for (const labelId of message.labelIds ?? []) {
      labelIds.add(labelId);
      const name = labelLookup?.getName(labelId) ?? labelId;
      labelNames.add(name);
    }
  }

  return {
    names: Array.from(labelNames),
    ids: Array.from(labelIds),
  };
}

function countThreadAttachments(messages: GmailMessage[]): number {
  let count = 0;

  for (const message of messages) {
    const content = extractContent(message);
    count += content.attachments.length;
  }

  return count;
}

function buildThreadContent(messages: GmailMessage[]): string {
  const parts: string[] = [];

  for (const message of messages) {
    const headers = parseHeaders(message);
    const content = extractContent(message);
    const text = getPlainTextContent(content);

    if (text) {
      const from = headers.from ?? "Unknown";
      parts.push(`From: ${from}\n${text}`);
    }
  }

  return parts.join("\n\n---\n\n");
}

export function transformThreads(
  threads: GmailThread[],
  context: GmailTransformContext,
  options: ThreadTransformOptions = {}
): ThreadTransformResult[] {
  return threads.map((thread) => transformThread(thread, context, options));
}
