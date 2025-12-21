export type EmailAttachment = {
  id: string;
  filename: string;
  mimeType: string;
  size?: number;
};

export type EmailMetadata = {
  to?: string[];
  cc?: string[];
  bcc?: string[];
  messageId?: string;
  inReplyTo?: string;
  references?: string[];
  attachments?: EmailAttachment[];
  labels?: string[];
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
  metadata?: EmailMetadata;
  url?: string;
};

export type EmailThread = {
  id: string;
  subject: string;
  messages: EmailMessage[];
  participantCount: number;
  messageCount: number;
  latestAt: number;
  url?: string;
};
