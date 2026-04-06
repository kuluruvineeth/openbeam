import {
  createMicrosoftGraphClient,
  type MicrosoftGraphClient,
} from "../../microsoft/client";
import {
  listMailFolders,
  moveEmail,
  replyToEmail,
  sendEmail,
} from "../../outlook/actions";
import { registerHandler } from "../handler-registry";
import type { ActionExecutionResult } from "../types";
import { str, strArr } from "./shared/params";

type Handler = (
  client: MicrosoftGraphClient,
  p: Record<string, unknown>
) => Promise<ActionExecutionResult>;

const actions: Record<string, Handler> = {
  async email_send(client, p) {
    const r = await sendEmail(client, {
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
    return { success: true, data: { sent: true } };
  },

  async email_reply(client, p) {
    const r = await replyToEmail(client, {
      messageId: str(p, "messageId"),
      body: str(p, "body"),
      replyAll: p.replyAll === true,
    });
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { replied: true } };
  },

  async email_move(client, p) {
    const r = await moveEmail(client, {
      messageId: str(p, "messageId"),
      destinationFolderId: str(p, "destinationFolderId"),
    });
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { moved: true } };
  },

  async folder_list(client) {
    const r = await listMailFolders(client);
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { folders: r.data } };
  },
};

registerHandler({
  connectorType: "outlook",
  supportedActions: Object.keys(actions),
  async execute(actionId, params, credentials, connectorId) {
    const handler = actions[actionId];
    if (!handler) {
      return {
        success: false,
        data: {},
        error: `Unsupported Outlook action: ${actionId}`,
      };
    }

    const client = createMicrosoftGraphClient({
      connectorId,
      accessToken: credentials.accessToken || "",
    });

    return await handler(client, params);
  },
});
