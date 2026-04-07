import {
  createDraft,
  deleteDraft,
  sendDraft,
} from "../../../gmail/actions/drafts";
import { optStr, str } from "../shared/params";
import {
  failure,
  type GmailHandler,
  looksLikeHtml,
  normalizeEmailList,
} from "./shared";

export const draft_create: GmailHandler = async ({ client, params }) => {
  const to = normalizeEmailList([params.to]);
  const body = optStr(params, "body") ?? "";
  const r = await createDraft(client, {
    to,
    subject: optStr(params, "subject") ?? "",
    body,
    isHtml: looksLikeHtml(body),
  });
  if (!r.success) {
    return failure(r.error);
  }
  return {
    success: true,
    data: { draftId: r.draftId, messageId: r.messageId },
  };
};

export const draft_delete: GmailHandler = async ({ client, params }) => {
  const r = await deleteDraft(client, str(params, "draftId"));
  if (!r.success) {
    return failure(r.error);
  }
  return { success: true, data: { deleted: true } };
};

export const draft_send: GmailHandler = async ({ client, params }) => {
  const r = await sendDraft(client, str(params, "draftId"));
  if (!r.success) {
    return failure(r.error);
  }
  return { success: true, data: { messageId: r.messageId } };
};
