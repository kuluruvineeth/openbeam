import {
  type AtlassianClient,
  createAtlassianClient,
} from "../../atlassian/client";
import {
  addConfluenceComment,
  archiveConfluencePage,
  createConfluencePage,
  listConfluenceSpaces,
  updateConfluencePage,
} from "../../confluence/actions";
import { registerHandler } from "../handler-registry";
import type { ActionExecutionResult } from "../types";
import { str } from "./shared/params";

type Handler = (
  client: AtlassianClient,
  p: Record<string, unknown>
) => Promise<ActionExecutionResult>;

const actions: Record<string, Handler> = {
  async space_list(client) {
    const r = await listConfluenceSpaces(client);
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { spaces: r.spaces } };
  },

  async page_create(client, p) {
    const r = await createConfluencePage(client, {
      spaceId: str(p, "spaceId"),
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
      title: str(p, "title"),
      body: str(p, "body"),
      versionMessage:
        typeof p.versionMessage === "string" ? p.versionMessage : undefined,
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
    const r = await addConfluenceComment(
      client,
      str(p, "pageId"),
      str(p, "body")
    );
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { commentId: r.commentId } };
  },
};

registerHandler({
  connectorType: "confluence",
  supportedActions: Object.keys(actions),
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
