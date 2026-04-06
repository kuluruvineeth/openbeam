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

function optStr(p: Record<string, unknown>, key: string): string | undefined {
  const v = p[key];
  return typeof v === "string" && v.trim() ? v.trim() : undefined;
}

function optStrArray(
  p: Record<string, unknown>,
  key: string
): string[] | undefined {
  const v = p[key];
  return Array.isArray(v) ? (v as string[]) : undefined;
}

const actions: Record<string, Handler> = {
  async content_create(client, p) {
    const r = await createContent(client, {
      title: str(p, "title"),
      language: optStr(p, "language"),
      slug: optStr(p, "slug"),
      type: optStr(p, "type"),
      customContentTypeId: optStr(p, "customContentTypeId"),
      body: optStr(p, "body"),
      feedKeys: optStrArray(p, "feedKeys"),
      status: optStr(p, "status"),
    });
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { id: r.id, url: r.url } };
  },

  async content_update(client, p) {
    const r = await updateContent(client, {
      contentId: str(p, "contentId"),
      title: optStr(p, "title"),
      language: optStr(p, "language"),
      body: optStr(p, "body"),
      slug: optStr(p, "slug"),
      status: optStr(p, "status"),
    });
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { id: r.id, url: r.url } };
  },

  async post_create(client, p) {
    const postType = optStr(p, "postType");
    const validPostTypes = ["DEFAULT", "IDEA", "QUESTION"];
    const resolvedPostType =
      postType && validPostTypes.includes(postType)
        ? (postType as "DEFAULT" | "IDEA" | "QUESTION")
        : undefined;

    const r = await createPost(client, {
      communityId: str(p, "communityId"),
      content: str(p, "content"),
      title: optStr(p, "title"),
      postType: resolvedPostType,
      language: optStr(p, "language"),
    });
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { id: r.id, url: r.url } };
  },
};

registerHandler({
  connectorType: "lumapps",
  supportedActions: Object.keys(actions),
  async execute(actionId, params, credentials, connectorId) {
    const handler = actions[actionId];
    if (!handler) {
      return {
        success: false,
        data: {},
        error: `Unsupported LumApps action: ${actionId}`,
      };
    }

    const config = credentials.config ?? {};
    const client = createLumAppsClient({
      connectorId,
      apiToken: credentials.accessToken,
      cellUrl: typeof config.cellUrl === "string" ? config.cellUrl : undefined,
      customerId:
        typeof config.customerId === "string" ? config.customerId : undefined,
      instanceId:
        typeof config.instanceId === "string" ? config.instanceId : undefined,
    });

    return await handler(client, params);
  },
});
