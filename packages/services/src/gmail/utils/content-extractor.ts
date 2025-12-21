import { extractAttachments, extractMedia } from "../api/attachments";
import type {
  ExtractedEmailContent,
  GmailMessage,
  GmailPart,
  GmailPayload,
  ParsedEmailHeaders,
} from "../types";

const WHITESPACE_REGEX = /\s+/;
const EMAIL_BRACKET_REGEX = /<([^>]+)>/;
const EMAIL_ADDRESS_REGEX = /[\w.+-]+@[\w.-]+\.\w+/;
const QUOTED_NAME_REGEX = /"([^"]+)"/;
const NAME_BEFORE_BRACKET_REGEX = /^([^<]+)</;

export function parseHeaders(message: GmailMessage): ParsedEmailHeaders {
  const headers = message.payload?.headers ?? [];
  const result: ParsedEmailHeaders = {};

  for (const header of headers) {
    const name = header.name.toLowerCase();
    const value = header.value;

    switch (name) {
      case "from":
        result.from = value;
        break;
      case "to":
        result.to = parseAddressList(value);
        break;
      case "cc":
        result.cc = parseAddressList(value);
        break;
      case "bcc":
        result.bcc = parseAddressList(value);
        break;
      case "subject":
        result.subject = value;
        break;
      case "date":
        result.date = parseEmailDate(value);
        break;
      case "message-id":
        result.messageId = value;
        break;
      case "in-reply-to":
        result.inReplyTo = value;
        break;
      case "references":
        result.references = value.split(WHITESPACE_REGEX).filter(Boolean);
        break;
      default:
        break;
    }
  }

  return result;
}

function parseAddressList(value: string): string[] {
  return value
    .split(",")
    .map((addr) => addr.trim())
    .filter(Boolean);
}

function parseEmailDate(value: string): Date | undefined {
  try {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? undefined : date;
  } catch {
    return;
  }
}

export function extractContent(message: GmailMessage): ExtractedEmailContent {
  const result: ExtractedEmailContent = {
    attachments: extractAttachments(message),
    media: extractMedia(message),
  };

  if (!message.payload) {
    return result;
  }

  const { plain, html } = extractBodyContent(message.payload);
  result.plain = plain;
  result.html = html;

  return result;
}

function extractBodyContent(payload: GmailPayload): {
  plain?: string;
  html?: string;
} {
  let plain: string | undefined;
  let html: string | undefined;

  function walkPart(part: GmailPart): void {
    const mimeType = part.mimeType.toLowerCase();

    if (mimeType === "text/plain" && part.body?.data && !plain) {
      plain = decodeBase64Url(part.body.data);
    } else if (mimeType === "text/html" && part.body?.data && !html) {
      html = decodeBase64Url(part.body.data);
    } else if (mimeType.startsWith("multipart/") && part.parts) {
      for (const subPart of part.parts) {
        walkPart(subPart);
      }
    }
  }

  if (payload.body?.data && !payload.parts) {
    const mimeType = payload.mimeType?.toLowerCase() ?? "";
    if (mimeType === "text/plain") {
      plain = decodeBase64Url(payload.body.data);
    } else if (mimeType === "text/html") {
      html = decodeBase64Url(payload.body.data);
    }
  } else if (payload.parts) {
    for (const part of payload.parts) {
      walkPart(part);
    }
  }

  return { plain, html };
}

function decodeBase64Url(data: string): string {
  const base64 = data.replace(/-/g, "+").replace(/_/g, "/");
  try {
    return Buffer.from(base64, "base64").toString("utf-8");
  } catch {
    return "";
  }
}

export function extractEmailAddress(from: string): string | undefined {
  const match = from.match(EMAIL_BRACKET_REGEX);
  if (match) {
    return match[1]?.toLowerCase();
  }

  const emailMatch = from.match(EMAIL_ADDRESS_REGEX);
  return emailMatch ? emailMatch[0].toLowerCase() : undefined;
}

export function extractSenderName(from: string): string | undefined {
  const quotedMatch = from.match(QUOTED_NAME_REGEX);
  if (quotedMatch) {
    return quotedMatch[1];
  }

  const nameMatch = from.match(NAME_BEFORE_BRACKET_REGEX);
  if (nameMatch) {
    return nameMatch[1]?.trim();
  }

  return;
}

export function stripHtmlTags(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

export function getPlainTextContent(content: ExtractedEmailContent): string {
  if (content.plain) {
    return content.plain;
  }
  if (content.html) {
    return stripHtmlTags(content.html);
  }
  return "";
}

export function buildEmailUrl(messageId: string): string {
  return `https://mail.google.com/mail/u/0/#inbox/${messageId}`;
}

export function buildThreadUrl(threadId: string): string {
  return `https://mail.google.com/mail/u/0/#inbox/${threadId}`;
}

export function getInternalDateMs(message: GmailMessage): number {
  if (message.internalDate) {
    return Number.parseInt(message.internalDate, 10);
  }
  return Date.now();
}

export function getAllParticipants(headers: ParsedEmailHeaders): string[] {
  const participants = new Set<string>();

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

  return Array.from(participants);
}
