import {
  addPageTags,
  createPage,
  updatePageContent,
} from "../../mindtouch/actions";
import {
  createMindtouchClient,
  type MindtouchClient,
} from "../../mindtouch/client";
import { registerHandler } from "../handler-registry";
import type { ActionExecutionResult } from "../types";

type Handler = (
  client: MindtouchClient,
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
  async page_create(client, p) {
    const r = await createPage(client, {
      parentPageId: str(p, "parentPageId"),
      title: str(p, "title"),
      content: str(p, "content"),
      tags: Array.isArray(p.tags) ? (p.tags as string[]) : undefined,
    });
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { id: r.id, url: r.url } };
  },

  async page_update_content(client, p) {
    const r = await updatePageContent(client, {
      pageId: str(p, "pageId"),
      content: str(p, "content"),
    });
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { id: r.id, url: r.url } };
  },

  async page_add_tags(client, p) {
    const tags = Array.isArray(p.tags) ? (p.tags as string[]) : [];
    const r = await addPageTags(client, {
      pageId: str(p, "pageId"),
      tags,
    });
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { id: r.id } };
  },
};

registerHandler({
  connectorType: "mindtouch",
  supportedActions: Object.keys(actions),
  async execute(actionId, params, credentials, connectorId) {
    const handler = actions[actionId];
    if (!handler) {
      return {
        success: false,
        data: {},
        error: `Unsupported MindTouch action: ${actionId}`,
      };
    }

    const client = createMindtouchClient({
      connectorId,
      apiToken: credentials.accessToken,
      instanceUrl: (credentials.config.instanceUrl as string) ?? "",
    });

    return await handler(client, params);
  },
});
