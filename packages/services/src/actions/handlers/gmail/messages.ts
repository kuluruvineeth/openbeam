import {
  addLabels,
  markAsRead,
  markAsUnread,
  modifyMessageLabels,
  removeLabels,
  star,
  unstar,
} from "../../../gmail/actions/labels";
import {
  archiveMessage,
  trashMessage,
  untrashMessage,
} from "../../../gmail/actions/messages";
import { str, strArr } from "../shared/params";
import { failure, type GmailHandler, toStringArray } from "./shared";

export const email_trash: GmailHandler = async ({ client, params }) => {
  const r = await trashMessage(client, str(params, "messageId"));
  if (!r.success) {
    return failure(r.error);
  }
  return { success: true, data: { messageId: r.messageId } };
};

export const email_modify_labels: GmailHandler = async ({ client, params }) => {
  const messageId = str(params, "messageId");
  const addLabelIds = toStringArray(params.addLabelIds);
  const removeLabelIds = toStringArray(params.removeLabelIds);
  const r = await modifyMessageLabels(client, {
    messageId,
    addLabelIds: addLabelIds.length ? addLabelIds : undefined,
    removeLabelIds: removeLabelIds.length ? removeLabelIds : undefined,
  });
  if (!r.success) {
    return failure(r.error);
  }
  return {
    success: true,
    data: { messageId: r.messageId, labelIds: r.labelIds ?? [] },
  };
};

export const message_archive: GmailHandler = async ({ client, params }) => {
  const r = await archiveMessage(client, str(params, "messageId"));
  if (!r.success) {
    return failure(r.error);
  }
  return { success: true, data: { archived: true } };
};

export const message_trash: GmailHandler = async ({ client, params }) => {
  const r = await trashMessage(client, str(params, "messageId"));
  if (!r.success) {
    return failure(r.error);
  }
  return { success: true, data: { trashed: true } };
};

export const message_untrash: GmailHandler = async ({ client, params }) => {
  const r = await untrashMessage(client, str(params, "messageId"));
  if (!r.success) {
    return failure(r.error);
  }
  return { success: true, data: { untrashed: true } };
};

export const message_mark_read: GmailHandler = async ({ client, params }) => {
  const r = await markAsRead(client, str(params, "messageId"));
  if (!r.success) {
    return failure(r.error);
  }
  return { success: true, data: { read: true } };
};

export const message_mark_unread: GmailHandler = async ({ client, params }) => {
  const r = await markAsUnread(client, str(params, "messageId"));
  if (!r.success) {
    return failure(r.error);
  }
  return { success: true, data: { unread: true } };
};

export const message_star: GmailHandler = async ({ client, params }) => {
  const r = await star(client, str(params, "messageId"));
  if (!r.success) {
    return failure(r.error);
  }
  return { success: true, data: { starred: true } };
};

export const message_unstar: GmailHandler = async ({ client, params }) => {
  const r = await unstar(client, str(params, "messageId"));
  if (!r.success) {
    return failure(r.error);
  }
  return { success: true, data: { unstarred: true } };
};

export const message_add_labels: GmailHandler = async ({ client, params }) => {
  const r = await addLabels(
    client,
    str(params, "messageId"),
    strArr(params, "labelIds")
  );
  if (!r.success) {
    return failure(r.error);
  }
  return { success: true, data: { labeled: true } };
};

export const message_remove_labels: GmailHandler = async ({
  client,
  params,
}) => {
  const r = await removeLabels(
    client,
    str(params, "messageId"),
    strArr(params, "labelIds")
  );
  if (!r.success) {
    return failure(r.error);
  }
  return { success: true, data: { removed: true } };
};
