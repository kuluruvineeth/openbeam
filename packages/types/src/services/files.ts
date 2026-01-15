import { z } from "zod";

export const DownloadStrategyUrlSchema = z.object({
  type: z.literal("url"),
  downloadUrl: z.string(),
});

export const DownloadStrategyGmailSchema = z.object({
  type: z.literal("gmail-attachment"),
  messageId: z.string(),
  attachmentId: z.string(),
});

export const DownloadStrategyDriveSchema = z.object({
  type: z.literal("google-drive"),
  fileId: z.string(),
  exportMimeType: z.string().optional(),
});

export const DownloadStrategySchema = z.discriminatedUnion("type", [
  DownloadStrategyUrlSchema,
  DownloadStrategyGmailSchema,
  DownloadStrategyDriveSchema,
]);

export type DownloadStrategy = z.infer<typeof DownloadStrategySchema>;

export const ConnectorFileInfoSchema = z.object({
  id: z.string(),
  name: z.string(),
  title: z.string().optional(),
  mimeType: z.string(),
  size: z.number().optional(),
  downloadStrategy: DownloadStrategySchema,
  permalink: z.string().optional(),
  createdAt: z.number().optional(),
  userId: z.string().optional(),
  userName: z.string().optional(),
  sourceChannelId: z.string().optional(),
  sourceMessageId: z.string().optional(),
});

export type ConnectorFileInfo = z.infer<typeof ConnectorFileInfoSchema>;

export const ConnectorMediaInfoSchema = ConnectorFileInfoSchema.extend({
  mediaType: z.enum(["video", "audio"]),
});

export type ConnectorMediaInfo = z.infer<typeof ConnectorMediaInfoSchema>;
