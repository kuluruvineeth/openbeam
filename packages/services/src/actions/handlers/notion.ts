import {
  addBlockComment,
  addPageComment,
  appendParagraph,
  archivePage,
  createDatabaseEntry,
  createPage,
  deleteBlock,
  getPage,
  listDatabases,
  queryDatabase,
  restorePage,
  searchPages,
  updateBlock,
  updateDatabaseEntry,
  updatePage,
} from "../../notion/actions";
import { createDatabase } from "../../notion/api/databases";
import { search as notionSearch } from "../../notion/api/search";
import { createNotionClient, type NotionClient } from "../../notion/client";
import { extractPageTitle } from "../../notion/utils/content-extractor";
import { createTextRichText } from "../../notion/utils/rich-text";
import { ActionExecutorError } from "../errors";
import { registerHandler } from "../handler-registry";
import type { ActionExecutionResult } from "../types";
import { optNum, optStr, str } from "./shared/params";

type Handler = (
  client: NotionClient,
  p: Record<string, unknown>
) => Promise<ActionExecutionResult>;

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

  async page_get(client, p) {
    const page = await getPage(client, str(p, "pageId"));
    if (!page) {
      throw new ActionExecutorError({
        code: "NOTION_NOT_FOUND",
        message: "Page not found",
        retryable: false,
        statusCode: 404,
      });
    }
    return { success: true, data: { pageId: page.id, url: page.url } };
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

  async database_query(client, p) {
    const databaseId = str(p, "databaseId");
    const pageSize = optNum(p, "pageSize") ?? 50;
    const results = await queryDatabase(client, databaseId, {
      filter:
        (p.filter as { property?: string; [key: string]: unknown }) ??
        undefined,
      sorts: Array.isArray(p.sorts)
        ? (p.sorts as {
            property?: string;
            direction: "ascending" | "descending";
          }[])
        : undefined,
      pageSize,
    });
    return {
      success: true,
      data: { results, total: results.length },
    };
  },

  async database_create(client, p) {
    const parentId = str(p, "parentId");
    const title = str(p, "title");
    const properties = (p.properties as Record<string, unknown>) ?? {
      Name: { title: {} },
    };
    const db = await createDatabase(client, {
      parent: { type: "page_id", page_id: parentId },
      title: createTextRichText(title),
      properties,
    });
    return {
      success: true,
      data: { databaseId: db.id, url: db.url },
    };
  },

  async search(client, p) {
    const query = optStr(p, "query") ?? "";
    const limit = optNum(p, "limit") ?? 20;
    const response = await notionSearch(client, {
      query: query || undefined,
      pageSize: Math.min(limit, 100),
    });
    const results = response.results.map((r) => ({
      id: r.id,
      object: r.object,
      title: r.object === "page" ? extractPageTitle(r) : "",
      url: "url" in r ? r.url : "",
    }));
    return { success: true, data: { results, total: results.length } };
  },

  async comment_create(client, p) {
    const r = await addPageComment(client, str(p, "pageId"), str(p, "text"));
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { commentId: r.commentId } };
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
