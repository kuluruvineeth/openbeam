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

  lines.push(`To: ${params.to.join(", ")}`);
  if (fromEmail) {
    lines.push(`From: ${fromEmail}`);
  }
  if (params.cc?.length) {
    lines.push(`Cc: ${params.cc.join(", ")}`);
  }
  if (params.bcc?.length) {
    lines.push(`Bcc: ${params.bcc.join(", ")}`);
  }
  lines.push(`Subject: ${params.subject}`);

  if (params.inReplyTo) {
    lines.push(`In-Reply-To: ${params.inReplyTo}`);
  }
  if (params.references?.length) {
    lines.push(`References: ${params.references.join(" ")}`);
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
