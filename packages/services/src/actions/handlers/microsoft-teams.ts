import {
  createMicrosoftGraphClient,
  type MicrosoftGraphClient,
} from "../../microsoft/client";
import {
  replyToTeamsMessage,
  sendTeamsMessage,
} from "../../microsoft-teams/actions";
import { registerHandler } from "../handler-registry";
import type { ActionExecutionResult } from "../types";

type Handler = (
  client: MicrosoftGraphClient,
  p: Record<string, unknown>
) => Promise<ActionExecutionResult>;

function str(p: Record<string, unknown>, key: string): string {
  const v = p[key];
  if (typeof v === "string" && v.trim()) {
    return v.trim();
  }
  throw new Error(`${key} is required`);
}

const actions: Record<string, Handler> = {
  async message_send(client, p) {
    const r = await sendTeamsMessage(client, {
      teamId: str(p, "teamId"),
      channelId: str(p, "channelId"),
      content: str(p, "content"),
    });
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { messageId: r.messageId } };
  },

  async message_reply(client, p) {
    const r = await replyToTeamsMessage(client, {
      teamId: str(p, "teamId"),
      channelId: str(p, "channelId"),
      messageId: str(p, "messageId"),
      content: str(p, "content"),
    });
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { messageId: r.messageId } };
  },
};

registerHandler({
  connectorType: "microsoft-teams",
  async execute(actionId, params, credentials, connectorId) {
    const handler = actions[actionId];
    if (!handler) {
      return {
        success: false,
        data: {},
        error: `Unsupported Microsoft Teams action: ${actionId}`,
      };
    }

    const client = createMicrosoftGraphClient({
      connectorId,
      accessToken: credentials.accessToken || "",
    });

    return await handler(client, params);
  },
});
