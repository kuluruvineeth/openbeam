import {
  createIntercomArticle,
  replyToIntercomConversation,
  tagIntercomConversation,
} from "../../intercom/actions";
import {
  createIntercomClient,
  type IntercomClient,
} from "../../intercom/client";
import { registerHandler } from "../handler-registry";
import type { ActionExecutionResult } from "../types";

type Handler = (
  client: IntercomClient,
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
  async conversation_reply(client, p) {
    const r = await replyToIntercomConversation(
      client,
      str(p, "conversation_id"),
      str(p, "body"),
      str(p, "admin_id")
    );
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return {
      success: true,
      data: { conversationId: r.conversationId },
    };
  },

  async conversation_tag(client, p) {
    const r = await tagIntercomConversation(
      client,
      str(p, "conversation_id"),
      str(p, "tag_id"),
      str(p, "admin_id")
    );
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return {
      success: true,
      data: { conversationId: r.conversationId },
    };
  },

  async article_create(client, p) {
    const r = await createIntercomArticle(client, {
      title: str(p, "title"),
      body: typeof p.body === "string" ? p.body : undefined,
      description:
        typeof p.description === "string" ? p.description : undefined,
      state: typeof p.state === "string" ? p.state : undefined,
      authorId: typeof p.author_id === "number" ? p.author_id : undefined,
    });
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return {
      success: true,
      data: { articleId: r.articleId, url: r.url },
    };
  },
};

registerHandler({
  connectorType: "intercom",
  async execute(actionId, params, credentials, connectorId) {
    const handler = actions[actionId];
    if (!handler) {
      return {
        success: false,
        data: {},
        error: `Unsupported Intercom action: ${actionId}`,
      };
    }

    const client = createIntercomClient({
      connectorId,
      accessToken: credentials.accessToken,
    });

    return await handler(client, params);
  },
});
