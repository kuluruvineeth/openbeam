import { createContent, updateContent } from "../../lumapps/actions/contents";
import { createPost } from "../../lumapps/actions/posts";
import { createLumAppsClient, type LumAppsClient } from "../../lumapps/client";
import { registerHandler } from "../handler-registry";
import type { ActionExecutionResult } from "../types";

type Handler = (
  client: LumAppsClient,
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
  async content_create(client, p) {
    const r = await createContent(client, {
      title: str(p, "title"),
      type: str(p, "type"),
      body: typeof p.body === "string" ? p.body : undefined,
      spaceId: typeof p.spaceId === "string" ? p.spaceId : undefined,
      tags: Array.isArray(p.tags) ? (p.tags as string[]) : undefined,
      status: typeof p.status === "string" ? p.status : undefined,
    });
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { id: r.id, url: r.url } };
  },

  async content_update(client, p) {
    const r = await updateContent(client, {
      contentId: str(p, "contentId"),
      title: typeof p.title === "string" ? p.title : undefined,
      body: typeof p.body === "string" ? p.body : undefined,
      tags: Array.isArray(p.tags) ? (p.tags as string[]) : undefined,
      status: typeof p.status === "string" ? p.status : undefined,
    });
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { id: r.id, url: r.url } };
  },

  async post_create(client, p) {
    const r = await createPost(client, {
      communityId: str(p, "communityId"),
      content: str(p, "content"),
    });
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { id: r.id, url: r.url } };
  },
};

registerHandler({
  connectorType: "lumapps",
  async execute(actionId, params, credentials) {
    const handler = actions[actionId];
    if (!handler) {
      return {
        success: false,
        data: {},
        error: `Unsupported LumApps action: ${actionId}`,
      };
    }

    const client = createLumAppsClient({
      connectorId: "",
      apiKey: (credentials.config.apiKey as string) ?? "",
      baseUrl: (credentials.config.baseUrl as string) ?? "",
    });

    return await handler(client, params);
  },
});
