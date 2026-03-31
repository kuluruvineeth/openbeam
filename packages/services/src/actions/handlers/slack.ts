import {
  addReaction,
  archiveChannel,
  createChannel,
  inviteToChannel,
  sendDM,
  sendMessage,
  setChannelTopic,
  updateMessage,
} from "../../slack/actions";
import { createSlackClient, type SlackClient } from "../../slack/client";
import { registerHandler } from "../handler-registry";
import type { ActionExecutionResult } from "../types";

type Handler = (
  client: SlackClient,
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
    const r = await sendMessage(client, {
      channel: str(p, "channel"),
      text: str(p, "text"),
      threadTs: typeof p.thread_ts === "string" ? p.thread_ts : undefined,
    });
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { ts: r.messageTs, channel: r.channelId } };
  },

  async message_update(client, p) {
    const r = await updateMessage(client, {
      channel: str(p, "channel"),
      ts: str(p, "ts"),
      text: typeof p.text === "string" ? p.text : undefined,
    });
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { ts: r.messageTs } };
  },

  async message_reply(client, p) {
    const r = await sendMessage(client, {
      channel: str(p, "channel"),
      text: str(p, "text"),
      threadTs: str(p, "thread_ts"),
    });
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { ts: r.messageTs, channel: r.channelId } };
  },

  async message_add_reaction(client, p) {
    const r = await addReaction(client, {
      channel: str(p, "channel"),
      timestamp: str(p, "timestamp"),
      name: str(p, "name"),
    });
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { ok: true } };
  },

  async channel_create(client, p) {
    const r = await createChannel(client, {
      name: str(p, "name"),
      isPrivate: p.is_private === true,
    });
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { channelId: r.channelId } };
  },

  async channel_archive(client, p) {
    const r = await archiveChannel(client, str(p, "channel"));
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { ok: true } };
  },

  async channel_set_topic(client, p) {
    const r = await setChannelTopic(client, {
      channel: str(p, "channel"),
      topic: str(p, "topic"),
    });
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { ok: true } };
  },

  async channel_invite(client, p) {
    const r = await inviteToChannel(client, {
      channel: str(p, "channel"),
      userId: str(p, "user_id"),
    });
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { ok: true } };
  },

  async dm_send(client, p) {
    const r = await sendDM(client, {
      userId: str(p, "user_id"),
      text: str(p, "text"),
    });
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { ts: r.messageTs, channel: r.channelId } };
  },
};

registerHandler({
  connectorType: "slack",
  async execute(actionId, params, credentials, connectorId) {
    const handler = actions[actionId];
    if (!handler) {
      return {
        success: false,
        data: {},
        error: `Unsupported Slack action: ${actionId}`,
      };
    }

    const token =
      credentials.accessToken ||
      (credentials.config.syncAccessToken as string) ||
      "";

    const client = createSlackClient({
      token,
      connectorId,
      teamId:
        typeof credentials.config.teamId === "string"
          ? credentials.config.teamId
          : undefined,
    });

    return await handler(client, params);
  },
});
