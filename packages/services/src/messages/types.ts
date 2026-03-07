import type { GenericDocument, JsonObject } from "@openbeam/vespa";

export type GetDocumentParams = {
  documentId: string;
};

export type GetEmailThreadParams = {
  threadId: string;
  connectorId: string;
};

export type GetSlackThreadParams = {
  parentId: string;
  connectorId: string;
};

export type DocumentResult = {
  id: string;
  connectorId: string;
  connectorType: string;
  documentType: string;
  threadId?: string;
  parentId?: string;
  title?: string;
  content?: string;
  contentHtml?: string;
  authorName?: string;
  authorEmail?: string;
  authorId?: string;
  createdAt: number;
  updatedAt?: number;
  sourceId?: string;
  sourceName?: string;
  sourceType?: string;
  replyCount?: number;
  reactionCount?: number;
  attachments?: GenericDocument["attachments"];
  url?: string;
  metadata?: JsonObject;
  mimeType?: string;
  fileName?: string;
};

export type EmailMessage = {
  id: string;
  threadId: string;
  title?: string;
  content?: string;
  contentHtml?: string;
  authorName?: string;
  authorEmail?: string;
  createdAt: number;
  metadata?: JsonObject;
  url?: string;
};

export type EmailThreadResult = {
  id: string;
  subject: string;
  messages: EmailMessage[];
  participantCount: number;
  messageCount: number;
  latestAt: number;
  url?: string;
};

export type SlackMessage = {
  id: string;
  threadId?: string;
  content?: string;
  contentHtml?: string;
  authorName?: string;
  authorId?: string;
  createdAt: number;
  replyCount?: number;
  reactionCount?: number;
  metadata?: JsonObject;
  url?: string;
};

export type SlackThreadResult = {
  id: string;
  channelId: string;
  channelName?: string;
  parent: SlackMessage;
  replies: SlackMessage[];
  replyCount: number;
  participantCount: number;
  url?: string;
};
