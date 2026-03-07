import { createHash } from "node:crypto";
import type {
  GmailAttachmentInfo,
  GmailMediaInfo,
} from "@openbeam/types/services/connectors/gmail";
import type { ConnectorFileInfo, ConnectorMediaInfo } from "../../files";

function createSafeAttachmentId(
  messageId: string,
  attachmentId: string
): string {
  const hash = createHash("sha256")
    .update(`${messageId}-${attachmentId}`)
    .digest("hex")
    .slice(0, 32);
  return `${messageId}-${hash}`;
}

export function transformGmailAttachment(
  attachment: GmailAttachmentInfo
): ConnectorFileInfo {
  const safeId = createSafeAttachmentId(
    attachment.messageId,
    attachment.attachmentId
  );
  return {
    id: safeId,
    name: attachment.filename,
    mimeType: attachment.mimeType,
    size: attachment.size,
    downloadStrategy: {
      type: "gmail-attachment",
      messageId: attachment.messageId,
      attachmentId: attachment.attachmentId,
    },
    sourceMessageId: attachment.messageId,
    sourceChannelId: attachment.threadId,
    userId: attachment.senderEmail,
    userName: attachment.senderName,
  };
}

export function transformGmailAttachments(
  attachments: GmailAttachmentInfo[]
): ConnectorFileInfo[] {
  return attachments.map(transformGmailAttachment);
}

export function transformGmailMedia(media: GmailMediaInfo): ConnectorMediaInfo {
  const safeId = createSafeAttachmentId(media.messageId, media.attachmentId);
  return {
    id: safeId,
    name: media.filename,
    mimeType: media.mimeType,
    size: media.size,
    downloadStrategy: {
      type: "gmail-attachment",
      messageId: media.messageId,
      attachmentId: media.attachmentId,
    },
    sourceMessageId: media.messageId,
    sourceChannelId: media.threadId,
    mediaType: media.mediaType,
    userId: media.senderEmail,
    userName: media.senderName,
  };
}

export function transformGmailMediaList(
  mediaList: GmailMediaInfo[]
): ConnectorMediaInfo[] {
  return mediaList.map(transformGmailMedia);
}
