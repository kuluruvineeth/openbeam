import type { KnownBlock } from "@slack/web-api";
import {
  addReaction,
  archiveChannel,
  createChannel,
  deleteMessage,
  inviteToChannel,
  sendDM,
  sendMessage,
  setChannelPurpose,
  setChannelTopic,
  updateMessage,
} from "../../slack/actions";
import { addBookmark } from "../../slack/api/bookmarks";
import { uploadFile } from "../../slack/api/files";
import { searchMessages } from "../../slack/api/search";
import { getUserInfo, lookupUserByEmail } from "../../slack/api/users";
import { createSlackClient, type SlackClient } from "../../slack/client";
import { ActionExecutorError, ActionValidationError } from "../errors";
import { registerHandler } from "../handler-registry";
import type { ActionCredentials, ActionExecutionResult } from "../types";
import { optStr, str, strArr } from "./shared/params";

type HandlerContext = {
  client: SlackClient;
  params: Record<string, unknown>;
};

type Handler = (context: HandlerContext) => Promise<ActionExecutionResult>;

const SYNC_TOKEN_ACTIONS = new Set(["message_search"]);

function getBlocks(p: Record<string, unknown>): KnownBlock[] | undefined {
  return Array.isArray(p.blocks) ? (p.blocks as KnownBlock[]) : undefined;
}

function failure(error: string | undefined): ActionExecutionResult {
  return { success: false, data: {}, error };
}

const actions: Record<string, Handler> = {
  message_send: async ({ client, params }) => {
    const r = await sendMessage(client, {
      channel: str(params, "channel"),
      text: str(params, "text"),
      threadTs: optStr(params, "thread_ts"),
      blocks: getBlocks(params),
    });
    if (!r.success) {
      return failure(r.error);
    }
    return { success: true, data: { ts: r.messageTs, channel: r.channelId } };
  },

  message_update: async ({ client, params }) => {
    const r = await updateMessage(client, {
      channel: str(params, "channel"),
      ts: str(params, "ts"),
      text: optStr(params, "text"),
      blocks: getBlocks(params),
    });
    if (!r.success) {
      return failure(r.error);
    }
    return { success: true, data: { ts: r.messageTs } };
  },

  message_delete: async ({ client, params }) => {
    const r = await deleteMessage(client, {
      channel: str(params, "channel"),
      ts: str(params, "ts"),
    });
    if (!r.success) {
      return failure(r.error);
    }
    return { success: true, data: { ok: true } };
  },

  message_reply: async ({ client, params }) => {
    const r = await sendMessage(client, {
      channel: str(params, "channel"),
      text: str(params, "text"),
      threadTs: str(params, "thread_ts"),
      blocks: getBlocks(params),
    });
    if (!r.success) {
      return failure(r.error);
    }
    return { success: true, data: { ts: r.messageTs, channel: r.channelId } };
  },

  message_add_reaction: async ({ client, params }) => {
    const r = await addReaction(client, {
      channel: str(params, "channel"),
      timestamp: str(params, "timestamp"),
      emoji: str(params, "emoji"),
    });
    if (!r.success) {
      return failure(r.error);
    }
    return { success: true, data: { ok: true } };
  },

  message_search: async ({ client, params }) => {
    const query = str(params, "query");
    const count = typeof params.count === "number" ? params.count : undefined;
    const sort = params.sort === "timestamp" ? "timestamp" : "score";
    const r = await searchMessages(client, query, { count, sort });
    return {
      success: true,
      data: { messages: r.matches, total: r.total },
    };
  },

  channel_create: async ({ client, params }) => {
    const name = str(params, "name");
    const r = await createChannel(client, {
      name,
      isPrivate: params.is_private === true,
    });
    if (!r.success) {
      return failure(r.error);
    }
    const description = optStr(params, "description");
    if (description && r.channelId) {
      await setChannelPurpose(client, {
        channel: r.channelId,
        purpose: description,
      });
    }
    return { success: true, data: { channelId: r.channelId, name } };
  },

  channel_archive: async ({ client, params }) => {
    const r = await archiveChannel(client, str(params, "channel"));
    if (!r.success) {
      return failure(r.error);
    }
    return { success: true, data: { ok: true } };
  },

  channel_set_topic: async ({ client, params }) => {
    const topic = str(params, "topic");
    const r = await setChannelTopic(client, {
      channel: str(params, "channel"),
      topic,
    });
    if (!r.success) {
      return failure(r.error);
    }
    return { success: true, data: { topic } };
  },

  channel_invite: async ({ client, params }) => {
    const users = Array.isArray(params.users)
      ? strArr(params, "users")
      : [str(params, "user_id")];
    if (users.length === 0) {
      throw new ActionValidationError("users is required", "users");
    }
    const r = await inviteToChannel(client, {
      channel: str(params, "channel"),
      users,
    });
    if (!r.success) {
      return failure(r.error);
    }
    return { success: true, data: { ok: true } };
  },

  user_lookup: async ({ client, params }) => {
    const email = optStr(params, "email");
    const userId = optStr(params, "user_id");
    if (!(email || userId)) {
      throw new ActionValidationError("email or user_id is required", "email");
    }
    const user = userId
      ? await getUserInfo(client, userId)
      : await lookupUserByEmail(client, email as string);
    if (!user) {
      throw new ActionExecutorError({
        code: "USER_NOT_FOUND",
        message: "User not found",
        retryable: false,
        statusCode: 404,
      });
    }
    return {
      success: true,
      data: {
        id: user.id,
        name: user.profile?.display_name ?? user.real_name ?? user.name,
        email: user.profile?.email ?? "",
      },
    };
  },

  file_upload: async ({ client, params }) => {
    const channels = strArr(params, "channels");
    if (channels.length === 0) {
      throw new ActionValidationError("channels is required", "channels");
    }
    const r = await uploadFile(client, {
      channels,
      filename: str(params, "filename"),
      content: str(params, "content"),
      title: optStr(params, "title"),
    });
    if (!(r.ok && r.file)) {
      return failure(r.error);
    }
    return {
      success: true,
      data: {
        id: r.file.id,
        url: r.file.url_private_download ?? r.file.url_private ?? "",
      },
    };
  },

  dm_send: async ({ client, params }) => {
    const r = await sendDM(client, {
      userId: str(params, "user_id"),
      text: str(params, "text"),
    });
    if (!r.success) {
      return failure(r.error);
    }
    return { success: true, data: { ts: r.messageTs, channel: r.channelId } };
  },

  bookmark_add: async ({ client, params }) => {
    const bookmark = await addBookmark(client, str(params, "channel"), {
      title: str(params, "title"),
      type: "link",
      link: str(params, "link"),
    });
    if (!bookmark) {
      throw new ActionExecutorError({
        code: "BOOKMARK_CREATE_FAILED",
        message: "Slack bookmark creation failed",
        retryable: false,
      });
    }
    return { success: true, data: { id: bookmark.id } };
  },
};

function selectToken(credentials: ActionCredentials, actionId: string): string {
  const sync =
    typeof credentials.config.syncAccessToken === "string"
      ? credentials.config.syncAccessToken
      : "";
  if (SYNC_TOKEN_ACTIONS.has(actionId)) {
    return sync || credentials.accessToken || "";
  }
  return credentials.accessToken || sync || "";
}

registerHandler({
  connectorType: "slack",
  supportedActions: Object.keys(actions),
  async execute(actionId, params, credentials, connectorId) {
    const handler = actions[actionId];
    if (!handler) {
      return failure(`Unsupported Slack action: ${actionId}`);
    }

    const client = createSlackClient({
      token: selectToken(credentials, actionId),
      connectorId,
      teamId:
        typeof credentials.config.teamId === "string"
          ? credentials.config.teamId
          : undefined,
    });

    return await handler({ client, params });
  },
});
