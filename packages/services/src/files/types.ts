export type DownloadStrategy =
  | { type: "url"; downloadUrl: string }
  | { type: "gmail-attachment"; messageId: string; attachmentId: string }
  | { type: "google-drive"; fileId: string; exportMimeType?: string };

export interface ConnectorFileInfo {
  id: string;
  name: string;
  title?: string;
  mimeType: string;
  size?: number;
  downloadStrategy: DownloadStrategy;
  permalink?: string;
  createdAt?: number;
  userId?: string;
  userName?: string;
  sourceChannelId?: string;
  sourceMessageId?: string;
}

export interface ConnectorMediaInfo extends ConnectorFileInfo {
  mediaType: "video" | "audio";
}
