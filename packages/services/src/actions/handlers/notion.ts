import {
  addBlockComment,
  addPageComment,
  appendParagraph,
  archivePage,
  createDatabaseEntry,
  createPage,
  deleteBlock,
  listDatabases,
  restorePage,
  searchPages,
  updateBlock,
  updateDatabaseEntry,
  updatePage,
} from "../../notion/actions";
import { createNotionClient, type NotionClient } from "../../notion/client";
import { registerHandler } from "../handler-registry";
import type { ActionExecutionResult } from "../types";

type Handler = (
  client: NotionClient,
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
  async database_list(client, p) {
    const limit = typeof p.limit === "number" ? p.limit : 50;
    const r = await listDatabases(client, limit);
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { databases: r.databases } };
  },

  async page_search(client, p) {
    const limit = typeof p.limit === "number" ? p.limit : 20;
    const r = await searchPages(client, str(p, "query"), limit);
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { pages: r.pages } };
  },

  async page_create(client, p) {
    const parentType =
      typeof p.parentType === "string"
        ? (p.parentType as "page" | "database")
        : "page";
    const r = await createPage(client, {
      parentId: str(p, "parentId"),
      parentType,
      title: str(p, "title"),
      content: typeof p.content === "string" ? p.content : undefined,
      properties: (p.properties as Record<string, unknown>) ?? undefined,
    });
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { pageId: r.pageId, url: r.url } };
  },

  async page_update(client, p) {
    const r = await updatePage(client, str(p, "pageId"), {
      properties: (p.properties as Record<string, unknown>) ?? undefined,
    });
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { pageId: r.pageId, url: r.url } };
  },

  async page_archive(client, p) {
    const r = await archivePage(client, str(p, "pageId"));
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { pageId: r.pageId } };
  },

  async page_restore(client, p) {
    const r = await restorePage(client, str(p, "pageId"));
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { pageId: r.pageId } };
  },

  async database_entry_create(client, p) {
    const r = await createDatabaseEntry(
      client,
      str(p, "databaseId"),
      (p.properties as Record<string, unknown>) ?? {}
    );
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return {
      success: true,
      data: { databaseId: r.databaseId, pageId: r.pageId, url: r.url },
    };
  },

  async database_entry_update(client, p) {
    const r = await updateDatabaseEntry(
      client,
      str(p, "pageId"),
      (p.properties as Record<string, unknown>) ?? {}
    );
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { pageId: r.pageId, url: r.url } };
  },

  async block_append(client, p) {
    const r = await appendParagraph(client, str(p, "parentId"), str(p, "text"));
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { blockIds: r.blockIds } };
  },

  async block_update(client, p) {
    const r = await updateBlock(
      client,
      str(p, "blockId"),
      (p.content as Record<string, unknown>) ?? {}
    );
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { blockId: r.blockId } };
  },

  async block_delete(client, p) {
    const r = await deleteBlock(client, str(p, "blockId"));
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { blockId: r.blockId } };
  },

  async comment_add_page(client, p) {
    const r = await addPageComment(client, str(p, "pageId"), str(p, "content"));
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { commentId: r.commentId } };
  },

  async comment_add_block(client, p) {
    const r = await addBlockComment(
      client,
      str(p, "blockId"),
      str(p, "discussionId"),
      str(p, "content")
    );
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { commentId: r.commentId } };
  },
};

registerHandler({
  connectorType: "notion",
  supportedActions: Object.keys(actions),
  async execute(actionId, params, credentials, connectorId) {
    const handler = actions[actionId];
    if (!handler) {
      return {
        success: false,
        data: {},
        error: `Unsupported Notion action: ${actionId}`,
      };
    }

    const client = createNotionClient({
      connectorId,
      accessToken: credentials.accessToken,
    });

    return await handler(client, params);
  },
});
