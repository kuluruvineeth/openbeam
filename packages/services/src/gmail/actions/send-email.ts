import type { GmailClient } from "../client";

interface SendResponse {
  id: string;
  threadId: string;
  labelIds?: string[];
}

export interface SendEmailParams {
  to: string[];
  subject: string;
  body: string;
  cc?: string[];
  bcc?: string[];
  replyTo?: string;
  isHtml?: boolean;
  threadId?: string;
  inReplyTo?: string;
  references?: string[];
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  threadId?: string;
  error?: string;
}

const BASE64_PLUS = /\+/g;
const BASE64_SLASH = /\//g;
const BASE64_PADDING = /=+$/;
const HTML_TAG = /<[^>]*>/g;

function sanitizeEmailHeader(value: string): string {
  return value.replace(/[\r\n\0]/g, "");
}

function sanitizeEmailAddresses(addresses: string[]): string[] {
  return addresses.map(sanitizeEmailHeader);
}

function encodeBase64Url(str: string): string {
  const base64 = btoa(unescape(encodeURIComponent(str)));
  return base64
    .replace(BASE64_PLUS, "-")
    .replace(BASE64_SLASH, "_")
    .replace(BASE64_PADDING, "");
}

function buildRawEmail(params: SendEmailParams, fromEmail?: string): string {
  const boundary = `boundary_${Date.now()}`;
  const lines: string[] = [];

  const sanitizedTo = sanitizeEmailAddresses(params.to);
  lines.push(`To: ${sanitizedTo.join(", ")}`);

  if (fromEmail) {
    lines.push(`From: ${sanitizeEmailHeader(fromEmail)}`);
  }
  if (params.cc?.length) {
    const sanitizedCc = sanitizeEmailAddresses(params.cc);
    lines.push(`Cc: ${sanitizedCc.join(", ")}`);
  }
  if (params.bcc?.length) {
    const sanitizedBcc = sanitizeEmailAddresses(params.bcc);
    lines.push(`Bcc: ${sanitizedBcc.join(", ")}`);
  }
  lines.push(`Subject: ${sanitizeEmailHeader(params.subject)}`);
  if (params.replyTo) {
    lines.push(`Reply-To: ${sanitizeEmailHeader(params.replyTo)}`);
  }

  if (params.inReplyTo) {
    lines.push(`In-Reply-To: ${sanitizeEmailHeader(params.inReplyTo)}`);
  }
  if (params.references?.length) {
    const sanitizedRefs = sanitizeEmailAddresses(params.references);
    lines.push(`References: ${sanitizedRefs.join(" ")}`);
  }

  lines.push("MIME-Version: 1.0");

  if (params.isHtml) {
    lines.push(`Content-Type: multipart/alternative; boundary="${boundary}"`);
    lines.push("");
    lines.push(`--${boundary}`);
    lines.push("Content-Type: text/plain; charset=UTF-8");
    lines.push("");
    lines.push(params.body.replace(HTML_TAG, ""));
    lines.push(`--${boundary}`);
    lines.push("Content-Type: text/html; charset=UTF-8");
    lines.push("");
    lines.push(params.body);
    lines.push(`--${boundary}--`);
  } else {
    lines.push("Content-Type: text/plain; charset=UTF-8");
    lines.push("");
    lines.push(params.body);
  }

  return lines.join("\r\n");
}

export async function sendEmail(
  client: GmailClient,
  params: SendEmailParams
): Promise<SendEmailResult> {
  const raw = buildRawEmail(params, client.userEmail);
  const encodedMessage = encodeBase64Url(raw);

  const body: { raw: string; threadId?: string } = { raw: encodedMessage };
  if (params.threadId) {
    body.threadId = params.threadId;
  }

  const response = await client.post<SendResponse>(
    "/users/me/messages/send",
    body
  );

  return {
    success: true,
    messageId: response.id,
    threadId: response.threadId,
  };
}

export interface ReplyParams {
  threadId: string;
  messageId: string;
  to: string[];
  body: string;
  cc?: string[];
  isHtml?: boolean;
}

export function replyToEmail(
  client: GmailClient,
  params: ReplyParams
): Promise<SendEmailResult> {
  return sendEmail(client, {
    to: params.to,
    subject: "",
    body: params.body,
    cc: params.cc,
    isHtml: params.isHtml,
    threadId: params.threadId,
    inReplyTo: params.messageId,
    references: [params.messageId],
  });
}
