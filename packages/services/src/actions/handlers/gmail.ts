import {
  createDraft,
  deleteDraft,
  sendDraft,
} from "../../gmail/actions/drafts";
import {
  addLabels,
  markAsRead,
  markAsUnread,
  removeLabels,
  star,
  unstar,
} from "../../gmail/actions/labels";
import {
  archiveMessage,
  trashMessage,
  untrashMessage,
} from "../../gmail/actions/messages";
import { replyToEmail, sendEmail } from "../../gmail/actions/send-email";
import { createGmailClient, type GmailClient } from "../../gmail/client";
import { registerHandler } from "../handler-registry";
import type { ActionExecutionResult } from "../types";

type Handler = (
  client: GmailClient,
  p: Record<string, unknown>
) => Promise<ActionExecutionResult>;

function str(p: Record<string, unknown>, key: string): string {
  const v = p[key];
  if (typeof v === "string" && v.trim()) {
    return v.trim();
  }
  throw new Error(`${key} is required`);
}

function strArr(p: Record<string, unknown>, key: string): string[] {
  const v = p[key];
  if (Array.isArray(v)) {
    return v as string[];
  }
  throw new Error(`${key} is required`);
}

const actions: Record<string, Handler> = {
  async email_send(client, p) {
    const r = await sendEmail(client, {
      to: strArr(p, "to"),
      subject: str(p, "subject"),
      body: str(p, "body"),
      cc: Array.isArray(p.cc) ? (p.cc as string[]) : undefined,
      bcc: Array.isArray(p.bcc) ? (p.bcc as string[]) : undefined,
      isHtml: p.isHtml === true,
      threadId: typeof p.threadId === "string" ? p.threadId : undefined,
    });
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return {
      success: true,
      data: { messageId: r.messageId, threadId: r.threadId },
    };
  },

  async email_reply(client, p) {
    const r = await replyToEmail(client, {
      threadId: str(p, "threadId"),
      messageId: str(p, "messageId"),
      to: strArr(p, "to"),
      body: str(p, "body"),
      cc: Array.isArray(p.cc) ? (p.cc as string[]) : undefined,
      isHtml: p.isHtml === true,
    });
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return {
      success: true,
      data: { messageId: r.messageId, threadId: r.threadId },
    };
  },

  async draft_create(client, p) {
    const r = await createDraft(client, {
      to: strArr(p, "to"),
      subject: str(p, "subject"),
      body: str(p, "body"),
      cc: Array.isArray(p.cc) ? (p.cc as string[]) : undefined,
      bcc: Array.isArray(p.bcc) ? (p.bcc as string[]) : undefined,
      isHtml: p.isHtml === true,
    });
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return {
      success: true,
      data: { draftId: r.draftId, messageId: r.messageId },
    };
  },

  async draft_delete(client, p) {
    const r = await deleteDraft(client, str(p, "draftId"));
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { deleted: true } };
  },

  async draft_send(client, p) {
    const r = await sendDraft(client, str(p, "draftId"));
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { messageId: r.messageId } };
  },

  async message_archive(client, p) {
    const r = await archiveMessage(client, str(p, "messageId"));
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { archived: true } };
  },

  async message_trash(client, p) {
    const r = await trashMessage(client, str(p, "messageId"));
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { trashed: true } };
  },

  async message_untrash(client, p) {
    const r = await untrashMessage(client, str(p, "messageId"));
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { untrashed: true } };
  },

  async message_mark_read(client, p) {
    const r = await markAsRead(client, str(p, "messageId"));
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { read: true } };
  },

  async message_mark_unread(client, p) {
    const r = await markAsUnread(client, str(p, "messageId"));
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { unread: true } };
  },

  async message_star(client, p) {
    const r = await star(client, str(p, "messageId"));
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { starred: true } };
  },

  async message_unstar(client, p) {
    const r = await unstar(client, str(p, "messageId"));
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { unstarred: true } };
  },

  async message_add_labels(client, p) {
    const r = await addLabels(
      client,
      str(p, "messageId"),
      strArr(p, "labelIds")
    );
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { labeled: true } };
  },

  async message_remove_labels(client, p) {
    const r = await removeLabels(
      client,
      str(p, "messageId"),
      strArr(p, "labelIds")
    );
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { removed: true } };
  },
};

registerHandler({
  connectorType: "gmail",
  async execute(actionId, params, credentials, connectorId) {
    const handler = actions[actionId];
    if (!handler) {
      return {
        success: false,
        data: {},
        error: `Unsupported Gmail action: ${actionId}`,
      };
    }

    const client = createGmailClient({
      connectorId,
      accessToken: credentials.accessToken || undefined,
      userEmail:
        typeof credentials.config.userEmail === "string"
          ? credentials.config.userEmail
          : undefined,
    });

    return await handler(client, params);
  },
});
