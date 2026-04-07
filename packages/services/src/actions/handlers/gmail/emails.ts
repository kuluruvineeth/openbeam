import { replyToEmail, sendEmail } from "../../../gmail/actions/send-email";
import { batchGetMessages, getMessage } from "../../../gmail/api/messages";
import {
  extractContent,
  extractEmailAddress,
  parseHeaders,
} from "../../../gmail/utils/content-extractor";
import { ActionExecutorError, ActionValidationError } from "../../errors";
import { optStr, str } from "../shared/params";
import {
  DEFAULT_SEARCH_LIMIT,
  FORWARD_PREFIX,
  failure,
  type GmailHandler,
  HTML_DELIMITER,
  looksLikeHtml,
  MAX_SEARCH_LIMIT,
  normalizeEmailList,
  notFound,
  PLAIN_DELIMITER,
  toStringArray,
} from "./shared";

export const email_send: GmailHandler = async ({ client, params }) => {
  const to = normalizeEmailList([params.to]);
  if (to.length === 0) {
    throw new ActionValidationError("to is required", "to");
  }
  const body = str(params, "body");
  const r = await sendEmail(client, {
    to,
    subject: str(params, "subject"),
    body,
    cc: normalizeEmailList([params.cc]),
    bcc: normalizeEmailList([params.bcc]),
    isHtml: looksLikeHtml(body),
  });
  if (!r.success) {
    return failure(r.error);
  }
  return {
    success: true,
    data: { messageId: r.messageId, threadId: r.threadId },
  };
};

export const email_reply: GmailHandler = async ({
  client,
  params,
  userEmail,
}) => {
  const threadId = str(params, "threadId");
  const messageId = str(params, "messageId");
  const body = str(params, "body");
  const message = await getMessage(client, messageId, { format: "metadata" });
  if (!message) {
    throw notFound("Message not found");
  }
  const headers = parseHeaders(message);
  const replyTo = headers.from ? extractEmailAddress(headers.from) : undefined;
  if (!replyTo) {
    throw new ActionExecutorError({
      code: "REPLY_RECIPIENT_NOT_FOUND",
      message: "Reply recipient not found",
      retryable: false,
    });
  }
  const replyAll = params.replyAll === true;
  const baseTo = replyAll
    ? normalizeEmailList([replyTo, ...(headers.to ?? [])])
    : [replyTo];
  const baseCc = replyAll ? normalizeEmailList(headers.cc ?? []) : [];
  const self = userEmail?.toLowerCase();
  const filteredTo = self
    ? baseTo.filter((addr) => addr.toLowerCase() !== self)
    : baseTo;
  const filteredCc = self
    ? baseCc.filter((addr) => addr.toLowerCase() !== self)
    : baseCc;
  const finalTo = filteredTo.length > 0 ? filteredTo : [replyTo];
  const r = await replyToEmail(client, {
    threadId,
    messageId,
    to: finalTo,
    cc: filteredCc.length > 0 ? filteredCc : undefined,
    body,
    isHtml: looksLikeHtml(body),
  });
  if (!r.success) {
    return failure(r.error);
  }
  return {
    success: true,
    data: { messageId: r.messageId, threadId: r.threadId },
  };
};

export const email_forward: GmailHandler = async ({ client, params }) => {
  const messageId = str(params, "messageId");
  const to = normalizeEmailList([params.to]);
  if (to.length === 0) {
    throw new ActionValidationError("to is required", "to");
  }
  const message = await getMessage(client, messageId, { format: "full" });
  if (!message) {
    throw notFound("Message not found");
  }
  const headers = parseHeaders(message);
  const subject = headers.subject ?? "";
  const forwardSubject = FORWARD_PREFIX.test(subject)
    ? subject
    : `Fwd: ${subject}`.trim();
  const extracted = extractContent(message);
  const originalBody =
    extracted.html ?? extracted.plain ?? message.snippet ?? "";
  const extraBody = optStr(params, "body") ?? "";
  const html = looksLikeHtml(originalBody) || looksLikeHtml(extraBody);
  const delimiter = html ? HTML_DELIMITER : PLAIN_DELIMITER;
  const body = extraBody
    ? `${extraBody}${delimiter}${originalBody}`
    : originalBody;
  const r = await sendEmail(client, {
    to,
    subject: forwardSubject,
    body,
    isHtml: html,
  });
  if (!r.success) {
    return failure(r.error);
  }
  return { success: true, data: { messageId: r.messageId } };
};

export const email_search: GmailHandler = async ({ client, params }) => {
  const query = str(params, "query");
  const rawMax =
    typeof params.maxResults === "number"
      ? params.maxResults
      : DEFAULT_SEARCH_LIMIT;
  const maxResults = Math.min(rawMax, MAX_SEARCH_LIMIT);
  const labelIds = toStringArray(params.labelIds);
  const response = await client.get<{
    messages?: { id: string; threadId: string }[];
    resultSizeEstimate?: number;
  }>("/users/me/messages", {
    q: query,
    maxResults,
    labelIds: labelIds.length > 0 ? labelIds : undefined,
  });
  const messageIds = response.messages?.map((m) => m.id) ?? [];
  const messages = await batchGetMessages(client, messageIds, {
    format: "full",
  });
  return {
    success: true,
    data: {
      messages,
      total: response.resultSizeEstimate ?? messages.length,
    },
  };
};

export const email_get: GmailHandler = async ({ client, params }) => {
  const messageId = str(params, "messageId");
  const format =
    params.format === "metadata" || params.format === "minimal"
      ? params.format
      : "full";
  const message = await getMessage(client, messageId, { format });
  if (!message) {
    throw notFound("Message not found");
  }
  const headers = parseHeaders(message);
  return {
    success: true,
    data: {
      id: message.id,
      threadId: message.threadId,
      subject: headers.subject ?? "",
      from: headers.from ?? "",
      snippet: message.snippet ?? "",
    },
  };
};
