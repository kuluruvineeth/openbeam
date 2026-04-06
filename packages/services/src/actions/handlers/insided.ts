import { createIdea, voteIdea } from "../../insided/actions/ideas";
import { createPost, createReply } from "../../insided/actions/posts";
import { createInsidedClient, type InsidedClient } from "../../insided/client";
import { registerHandler } from "../handler-registry";
import type { ActionExecutionResult } from "../types";
import { str } from "./shared/params";

type Handler = (
  client: InsidedClient,
  p: Record<string, unknown>
) => Promise<ActionExecutionResult>;

const actions: Record<string, Handler> = {
  async idea_create(client, p) {
    const r = await createIdea(client, {
      title: str(p, "title"),
      content: str(p, "content"),
      categoryId: str(p, "categoryId"),
    });
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { id: r.id, url: r.url } };
  },

  async idea_vote(client, p) {
    const r = await voteIdea(client, { ideaId: str(p, "ideaId") });
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { voted: true } };
  },

  async post_create(client, p) {
    const r = await createPost(client, {
      title: str(p, "title"),
      content: str(p, "content"),
      categoryId: str(p, "categoryId"),
    });
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { id: r.id, url: r.url } };
  },

  async post_reply(client, p) {
    const r = await createReply(client, {
      postId: str(p, "postId"),
      content: str(p, "content"),
    });
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { id: r.id } };
  },
};

registerHandler({
  connectorType: "insided",
  supportedActions: Object.keys(actions),
  async execute(actionId, params, credentials) {
    const handler = actions[actionId];
    if (!handler) {
      return {
        success: false,
        data: {},
        error: `Unsupported inSided action: ${actionId}`,
      };
    }

    const client = createInsidedClient({
      connectorId: "",
      apiKey: (credentials.config.apiKey as string) ?? "",
      communityUrl: (credentials.config.communityUrl as string) ?? "",
    });

    return await handler(client, params);
  },
});
