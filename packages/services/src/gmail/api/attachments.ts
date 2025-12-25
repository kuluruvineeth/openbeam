import type { GmailClient } from "../client";
import {
  type GmailAttachment,
  type GmailAttachmentInfo,
  GmailAttachmentSchema,
  type GmailMediaInfo,
  type GmailMessage,
  type GmailPart,
  isMediaType,
  isSupportedAttachment,
} from "../types";

const EMAIL_BRACKET_REGEX = /<([^>]+)>/;
const EMAIL_ADDRESS_REGEX = /[\w.+-]+@[\w.-]+\.\w+/;
const QUOTED_NAME_REGEX = /"([^"]+)"/;
const NAME_BEFORE_BRACKET_REGEX = /^([^<]+)</;

function getSenderFromMessage(message: GmailMessage): {
  email?: string;
  name?: string;
} {
  const headers = message.payload?.headers ?? [];
  const fromHeader = headers.find(
    (h) => h.name.toLowerCase() === "from"
  )?.value;
  if (!fromHeader) {
    return {};
  }

  const emailMatch = fromHeader.match(EMAIL_BRACKET_REGEX);
  const email = emailMatch
    ? emailMatch[1]?.toLowerCase()
    : fromHeader.match(EMAIL_ADDRESS_REGEX)?.[0]?.toLowerCase();

  const quotedMatch = fromHeader.match(QUOTED_NAME_REGEX);
  const name = quotedMatch
    ? quotedMatch[1]
    : fromHeader.match(NAME_BEFORE_BRACKET_REGEX)?.[1]?.trim();

  return { email, name };
}

export async function getAttachment(
  client: GmailClient,
  messageId: string,
  attachmentId: string
): Promise<GmailAttachment | null> {
  const response = await client.get<GmailAttachment>(
    `/users/me/messages/${messageId}/attachments/${attachmentId}`
  );

  const parsed = GmailAttachmentSchema.safeParse(response);
  return parsed.success ? parsed.data : null;
}

export async function downloadAttachment(
  client: GmailClient,
  messageId: string,
  attachmentId: string
): Promise<Buffer | null> {
  const attachment = await getAttachment(client, messageId, attachmentId);
  if (!attachment?.data) {
    return null;
  }

  const base64 = attachment.data.replace(/-/g, "+").replace(/_/g, "/");

  return Buffer.from(base64, "base64");
}

export function extractAttachments(
  message: GmailMessage
): GmailAttachmentInfo[] {
  const attachments: GmailAttachmentInfo[] = [];

  if (!message.payload) {
    return attachments;
  }

  const sender = getSenderFromMessage(message);

  function walkParts(parts: GmailPart[] | undefined): void {
    if (!parts) {
      return;
    }

    for (const part of parts) {
      if (
        part.filename &&
        part.body?.attachmentId &&
        part.body.size > 0 &&
        isSupportedAttachment(part.mimeType)
      ) {
        attachments.push({
          attachmentId: part.body.attachmentId,
          messageId: message.id,
          threadId: message.threadId,
          filename: part.filename,
          mimeType: part.mimeType,
          size: part.body.size,
          senderEmail: sender.email,
          senderName: sender.name,
        });
      }

      if (part.parts) {
        walkParts(part.parts);
      }
    }
  }

  if (message.payload.parts) {
    walkParts(message.payload.parts);
  } else if (
    message.payload.filename &&
    message.payload.body?.attachmentId &&
    message.payload.body.size > 0 &&
    isSupportedAttachment(message.payload.mimeType ?? "")
  ) {
    attachments.push({
      attachmentId: message.payload.body.attachmentId,
      messageId: message.id,
      threadId: message.threadId,
      filename: message.payload.filename,
      mimeType: message.payload.mimeType ?? "application/octet-stream",
      size: message.payload.body.size,
      senderEmail: sender.email,
      senderName: sender.name,
    });
  }

  return attachments;
}

export function extractMedia(message: GmailMessage): GmailMediaInfo[] {
  const media: GmailMediaInfo[] = [];

  if (!message.payload) {
    return media;
  }

  const sender = getSenderFromMessage(message);

  function walkParts(parts: GmailPart[] | undefined): void {
    if (!parts) {
      return;
    }

    for (const part of parts) {
      if (
        part.filename &&
        part.body?.attachmentId &&
        part.body.size > 0 &&
        isMediaType(part.mimeType)
      ) {
        const mediaType = part.mimeType.startsWith("video/")
          ? "video"
          : "audio";
        media.push({
          attachmentId: part.body.attachmentId,
          messageId: message.id,
          threadId: message.threadId,
          filename: part.filename,
          mimeType: part.mimeType,
          size: part.body.size,
          mediaType,
          senderEmail: sender.email,
          senderName: sender.name,
        });
      }

      if (part.parts) {
        walkParts(part.parts);
      }
    }
  }

  if (message.payload.parts) {
    walkParts(message.payload.parts);
  } else if (
    message.payload.filename &&
    message.payload.body?.attachmentId &&
    message.payload.body.size > 0 &&
    isMediaType(message.payload.mimeType ?? "")
  ) {
    const mediaType = (message.payload.mimeType ?? "").startsWith("video/")
      ? "video"
      : "audio";

    media.push({
      attachmentId: message.payload.body.attachmentId,
      messageId: message.id,
      threadId: message.threadId,
      filename: message.payload.filename,
      mimeType: message.payload.mimeType ?? "application/octet-stream",
      size: message.payload.body.size,
      mediaType,
      senderEmail: sender.email,
      senderName: sender.name,
    });
  }

  return media;
}

export function extractAllAttachments(
  messages: GmailMessage[]
): GmailAttachmentInfo[] {
  const attachments: GmailAttachmentInfo[] = [];

  for (const message of messages) {
    attachments.push(...extractAttachments(message));
  }

  return attachments;
}

export function extractAllMedia(messages: GmailMessage[]): GmailMediaInfo[] {
  const media: GmailMediaInfo[] = [];

  for (const message of messages) {
    media.push(...extractMedia(message));
  }

  return media;
}

export function hasAttachments(message: GmailMessage): boolean {
  if (!message.payload?.parts) {
    return false;
  }

  function checkParts(parts: GmailPart[]): boolean {
    for (const part of parts) {
      if (part.filename && part.body?.attachmentId) {
        return true;
      }
      if (part.parts && checkParts(part.parts)) {
        return true;
      }
    }
    return false;
  }

  return checkParts(message.payload.parts);
}

export function getTotalAttachmentSize(
  attachments: GmailAttachmentInfo[]
): number {
  return attachments.reduce((sum, att) => sum + att.size, 0);
}
