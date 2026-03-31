import {
  type AtlassianClient,
  createAtlassianClient,
} from "../../atlassian/client";
import {
  addConfluenceComment,
  archiveConfluencePage,
  createConfluencePage,
  updateConfluencePage,
} from "../../confluence/actions";
import { registerHandler } from "../handler-registry";
import type { ActionExecutionResult } from "../types";

type Handler = (
  client: AtlassianClient,
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
    const r = await createConfluencePage(client, {
      spaceKey: str(p, "spaceKey"),
      title: str(p, "title"),
      body: typeof p.body === "string" ? p.body : "",
      parentId: typeof p.parentId === "string" ? p.parentId : undefined,
    });
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { pageId: r.pageId, url: r.url } };
  },

  async page_update(client, p) {
    const r = await updateConfluencePage(client, {
      pageId: str(p, "pageId"),
      title: typeof p.title === "string" ? p.title : undefined,
      body: typeof p.body === "string" ? p.body : undefined,
      version: typeof p.version === "number" ? p.version : undefined,
    });
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { pageId: r.pageId } };
  },

  async page_archive(client, p) {
    const r = await archiveConfluencePage(client, str(p, "pageId"));
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { archived: true } };
  },

  async comment_add(client, p) {
    const r = await addConfluenceComment(client, {
      pageId: str(p, "pageId"),
      body: str(p, "body"),
    });
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { commentId: r.commentId } };
  },
};

registerHandler({
  connectorType: "confluence",
  async execute(actionId, params, credentials, connectorId) {
    const handler = actions[actionId];
    if (!handler) {
      return {
        success: false,
        data: {},
        error: `Unsupported Confluence action: ${actionId}`,
      };
    }

    const client = createAtlassianClient({
      connectorId,
      accessToken: credentials.accessToken,
      cloudId: (credentials.config.cloudId as string) ?? "",
      product: "confluence",
    });

    return await handler(client, params);
  },
});
