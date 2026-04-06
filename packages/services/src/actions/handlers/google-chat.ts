import { listChatSpaces, sendChatMessage } from "../../google-chat/actions";
import {
  createGoogleChatClient,
  type GoogleChatClient,
} from "../../google-chat/client";
import { registerHandler } from "../handler-registry";
import type { ActionExecutionResult } from "../types";
import { str } from "./shared/params";

type Handler = (
  client: GoogleChatClient,
  p: Record<string, unknown>
) => Promise<ActionExecutionResult>;

const actions: Record<string, Handler> = {
  async message_send(client, p) {
    const r = await sendChatMessage(
      client,
      str(p, "spaceName"),
      str(p, "text")
    );
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { messageId: r.messageId } };
  },

  async space_list(client) {
    const r = await listChatSpaces(client);
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { spaces: r.data } };
  },
};

registerHandler({
  connectorType: "google-chat",
  supportedActions: Object.keys(actions),
  async execute(actionId, params, credentials, connectorId) {
    const handler = actions[actionId];
    if (!handler) {
      return {
        success: false,
        data: {},
        error: `Unsupported Google Chat action: ${actionId}`,
      };
    }

    const client = createGoogleChatClient({
      connectorId,
      accessToken: credentials.accessToken || "",
    });

    return await handler(client, params);
  },
});
