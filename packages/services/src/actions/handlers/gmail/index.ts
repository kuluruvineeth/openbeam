import { createGmailClient } from "../../../gmail/client";
import { registerHandler } from "../../handler-registry";
import { draft_create, draft_delete, draft_send } from "./drafts";
import {
  email_forward,
  email_get,
  email_reply,
  email_search,
  email_send,
} from "./emails";
import { label_create, label_list } from "./labels";
import {
  email_modify_labels,
  email_trash,
  message_add_labels,
  message_archive,
  message_mark_read,
  message_mark_unread,
  message_remove_labels,
  message_star,
  message_trash,
  message_unstar,
  message_untrash,
} from "./messages";
import { failure, type GmailHandler } from "./shared";
import { thread_get, thread_trash } from "./threads";

const actions: Record<string, GmailHandler> = {
  email_send,
  email_reply,
  email_forward,
  email_search,
  email_get,
  email_trash,
  email_modify_labels,
  label_list,
  label_create,
  draft_create,
  draft_delete,
  draft_send,
  thread_get,
  thread_trash,
  message_archive,
  message_trash,
  message_untrash,
  message_mark_read,
  message_mark_unread,
  message_star,
  message_unstar,
  message_add_labels,
  message_remove_labels,
};

registerHandler({
  connectorType: "gmail",
  supportedActions: Object.keys(actions),
  async execute(actionId, params, credentials, connectorId) {
    const handler = actions[actionId];
    if (!handler) {
      return failure(`Unsupported Gmail action: ${actionId}`);
    }

    const userEmail =
      typeof credentials.config.userEmail === "string"
        ? credentials.config.userEmail
        : undefined;

    const client = createGmailClient({
      connectorId,
      accessToken: credentials.accessToken || undefined,
      userEmail,
    });

    return await handler({ client, params, userEmail });
  },
});
