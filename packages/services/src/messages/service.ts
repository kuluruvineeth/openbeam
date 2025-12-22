import { vespaClient } from "@openplane/vespa";
import type {
  DocumentResult,
  EmailMessage,
  EmailThreadResult,
  GetDocumentParams,
  GetEmailThreadParams,
  GetSlackThreadParams,
  SlackMessage,
  SlackThreadResult,
} from "./types";

export class MessagesService {
  async getDocument(params: GetDocumentParams): Promise<DocumentResult | null> {
    const doc = await vespaClient.getDocument(params.documentId);

    if (!doc) {
      return null;
    }

    return {
      id: doc.id,
      connectorId: doc.connector_id,
      connectorType: doc.connector_type,
      documentType: doc.document_type,
      threadId: doc.thread_id,
      parentId: doc.parent_id,
      title: doc.title,
      content: doc.content,
      contentHtml: doc.content_html,
      authorName: doc.author_name,
      authorEmail: doc.author_email,
      authorId: doc.author_id,
      createdAt: doc.created_at,
      updatedAt: doc.updated_at,
      sourceId: doc.source_id,
      sourceName: doc.source_name,
      sourceType: doc.source_type,
      replyCount: doc.reply_count,
      reactionCount: doc.reaction_count,
      attachments: doc.attachments,
      url: doc.url,
      metadata: doc.metadata,
      mimeType: doc.mime_type,
      fileName: doc.file_name,
    };
  }

  async getEmailThread(
    params: GetEmailThreadParams
  ): Promise<EmailThreadResult | null> {
    const results = await vespaClient.queryByThreadId(
      params.threadId,
      params.connectorId
    );

    const messages = results.root?.children?.map((hit) => hit.fields) ?? [];

    if (messages.length === 0) {
      return null;
    }

    const sorted = messages.sort((a, b) => a.created_at - b.created_at);
    const first = sorted[0];
    const last = sorted.at(-1);

    const participants = new Set<string>();
    for (const msg of sorted) {
      if (msg.author_email) {
        participants.add(msg.author_email);
      }
    }

    const emailMessages: EmailMessage[] = sorted.map((msg) => ({
      id: msg.id,
      threadId: msg.thread_id ?? params.threadId,
      title: msg.title,
      content: msg.content,
      contentHtml: msg.content_html,
      authorName: msg.author_name,
      authorEmail: msg.author_email,
      createdAt: msg.created_at,
      metadata: msg.metadata,
      url: msg.url,
    }));

    return {
      id: params.threadId,
      subject: first?.title ?? "No Subject",
      messages: emailMessages,
      participantCount: participants.size,
      messageCount: sorted.length,
      latestAt: last?.created_at ?? Date.now(),
      url: first?.url,
    };
  }

  async getSlackThread(
    params: GetSlackThreadParams
  ): Promise<SlackThreadResult | null> {
    const [parentResult, repliesResult] = await Promise.all([
      vespaClient.getDocument(params.parentId),
      vespaClient.queryByParentId(params.parentId, params.connectorId),
    ]);

    if (!parentResult) {
      return null;
    }

    const replies =
      repliesResult.root?.children?.map((hit) => hit.fields) ?? [];
    const sortedReplies = replies.sort((a, b) => a.created_at - b.created_at);

    const participants = new Set<string>();
    if (parentResult.author_id) {
      participants.add(parentResult.author_id);
    }
    for (const reply of sortedReplies) {
      if (reply.author_id) {
        participants.add(reply.author_id);
      }
    }

    const mapToSlackMessage = (
      msg: (typeof replies)[number] | typeof parentResult
    ): SlackMessage => ({
      id: msg.id,
      threadId: msg.thread_id,
      content: msg.content,
      contentHtml: msg.content_html,
      authorName: msg.author_name,
      authorId: msg.author_id,
      createdAt: msg.created_at,
      replyCount: msg.reply_count,
      reactionCount: msg.reaction_count,
      metadata: msg.metadata,
      url: msg.url,
    });

    return {
      id: params.parentId,
      channelId: parentResult.source_id ?? "",
      channelName: parentResult.source_name,
      parent: mapToSlackMessage(parentResult),
      replies: sortedReplies.map(mapToSlackMessage),
      replyCount: sortedReplies.length,
      participantCount: participants.size,
      url: parentResult.url,
    };
  }
}

export const messagesService = new MessagesService();
