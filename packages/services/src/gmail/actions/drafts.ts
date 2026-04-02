import type { GmailClient } from "../client";

interface DraftResponse {
  id: string;
  message: {
    id: string;
    threadId: string;
  };
}

export interface CreateDraftParams {
  to: string[];
  subject: string;
  body: string;
  cc?: string[];
  bcc?: string[];
  isHtml?: boolean;
  threadId?: string;
  inReplyTo?: string;
}

export interface DraftResult {
  success: boolean;
  draftId?: string;
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

function buildRawEmail(params: CreateDraftParams, fromEmail?: string): string {
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

export async function createDraft(
  client: GmailClient,
  params: CreateDraftParams
): Promise<DraftResult> {
  const raw = buildRawEmail(params, client.userEmail);
  const encodedMessage = encodeBase64Url(raw);

  const body: { message: { raw: string; threadId?: string } } = {
    message: { raw: encodedMessage },
  };
  if (params.threadId) {
    body.message.threadId = params.threadId;
  }

  const response = await client.post<DraftResponse>("/users/me/drafts", body);

  return {
    success: true,
    draftId: response.id,
    messageId: response.message.id,
    threadId: response.message.threadId,
  };
}

export async function deleteDraft(
  client: GmailClient,
  draftId: string
): Promise<{ success: boolean; error?: string }> {
  await client.del(`/users/me/drafts/${draftId}`);
  return { success: true };
}

export async function sendDraft(
  client: GmailClient,
  draftId: string
): Promise<DraftResult> {
  const response = await client.post<DraftResponse>("/users/me/drafts/send", {
    id: draftId,
  });

  return {
    success: true,
    draftId: response.id,
    messageId: response.message.id,
    threadId: response.message.threadId,
  };
}
