import { z } from "zod";

export const GetDocumentParamsSchema = z.object({
  documentId: z.string(),
  teamId: z.string(),
});

export type GetDocumentParams = z.infer<typeof GetDocumentParamsSchema>;

export const GetEmailThreadParamsSchema = z.object({
  threadId: z.string(),
  connectorId: z.string(),
  teamId: z.string(),
});

export type GetEmailThreadParams = z.infer<typeof GetEmailThreadParamsSchema>;

export const GetSlackThreadParamsSchema = z.object({
  channelId: z.string(),
  threadTs: z.string(),
  connectorId: z.string(),
  teamId: z.string(),
});

export type GetSlackThreadParams = z.infer<typeof GetSlackThreadParamsSchema>;

export const DocumentResultSchema = z.object({
  id: z.string(),
  title: z.string(),
  content: z.string(),
  url: z.string().optional(),
  connectorType: z.string(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
  author: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type DocumentResult = z.infer<typeof DocumentResultSchema>;

export const EmailMessageSchema = z.object({
  id: z.string(),
  threadId: z.string(),
  from: z.string(),
  to: z.array(z.string()),
  cc: z.array(z.string()).optional(),
  subject: z.string(),
  body: z.string(),
  bodyHtml: z.string().optional(),
  date: z.date(),
  attachments: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
        mimeType: z.string(),
        size: z.number(),
      })
    )
    .optional(),
});

export type EmailMessage = z.infer<typeof EmailMessageSchema>;

export const EmailThreadResultSchema = z.object({
  id: z.string(),
  subject: z.string(),
  messages: z.array(EmailMessageSchema),
  participants: z.array(z.string()),
  lastMessageDate: z.date(),
});

export type EmailThreadResult = z.infer<typeof EmailThreadResultSchema>;

export const SlackThreadMessageSchema = z.object({
  ts: z.string(),
  user: z.string().optional(),
  userName: z.string().optional(),
  text: z.string(),
  timestamp: z.date(),
  reactions: z
    .array(
      z.object({
        name: z.string(),
        count: z.number(),
      })
    )
    .optional(),
  files: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
        mimeType: z.string(),
        size: z.number().optional(),
      })
    )
    .optional(),
});

export type SlackThreadMessage = z.infer<typeof SlackThreadMessageSchema>;

export const SlackThreadResultSchema = z.object({
  channelId: z.string(),
  channelName: z.string().optional(),
  threadTs: z.string(),
  messages: z.array(SlackThreadMessageSchema),
  replyCount: z.number(),
});

export type SlackThreadResult = z.infer<typeof SlackThreadResultSchema>;
