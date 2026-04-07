import { beforeEach, describe, expect, it, mock } from "bun:test";

const listDatabasesMock = mock(() =>
  Promise.resolve({ success: true, databases: [{ id: "db1", title: "Tasks" }] })
);
const searchPagesMock = mock(() =>
  Promise.resolve({ success: true, pages: [{ id: "p1", title: "Hello" }] })
);
type PageResult = {
  success: boolean;
  pageId?: string;
  url?: string;
  error?: string;
};

const createPageMock = mock(
  (): Promise<PageResult> =>
    Promise.resolve({
      success: true,
      pageId: "p2",
      url: "https://notion.so/p2",
    })
);
const updatePageMock = mock(() =>
  Promise.resolve({ success: true, pageId: "p1", url: "https://notion.so/p1" })
);
const archivePageMock = mock(() =>
  Promise.resolve({ success: true, pageId: "p1" })
);
const restorePageMock = mock(() =>
  Promise.resolve({ success: true, pageId: "p1" })
);
const createDatabaseEntryMock = mock(() =>
  Promise.resolve({
    success: true,
    databaseId: "db1",
    pageId: "p3",
    url: "https://notion.so/p3",
  })
);
const updateDatabaseEntryMock = mock(() =>
  Promise.resolve({ success: true, pageId: "p3", url: "https://notion.so/p3" })
);
const appendParagraphMock = mock(() =>
  Promise.resolve({ success: true, blockIds: ["b1"] })
);
const updateBlockMock = mock(() =>
  Promise.resolve({ success: true, blockId: "b1" })
);
const deleteBlockMock = mock(() =>
  Promise.resolve({ success: true, blockId: "b1" })
);
const addPageCommentMock = mock(() =>
  Promise.resolve({ success: true, commentId: "c1" })
);
const addBlockCommentMock = mock(() =>
  Promise.resolve({ success: true, commentId: "c2" })
);

type PageObj = { id: string; url: string; object: string } | null;

const getPageMock = mock(
  (): Promise<PageObj> =>
    Promise.resolve({ id: "p1", url: "https://notion.so/p1", object: "page" })
);
const queryDatabaseMock = mock(() =>
  Promise.resolve([{ id: "row1" }, { id: "row2" }])
);

mock.module("../../../notion/actions", () => ({
  listDatabases: listDatabasesMock,
  searchPages: searchPagesMock,
  createPage: createPageMock,
  updatePage: updatePageMock,
  archivePage: archivePageMock,
  restorePage: restorePageMock,
  getPage: getPageMock,
  queryDatabase: queryDatabaseMock,
  createDatabaseEntry: createDatabaseEntryMock,
  updateDatabaseEntry: updateDatabaseEntryMock,
  appendParagraph: appendParagraphMock,
  updateBlock: updateBlockMock,
  deleteBlock: deleteBlockMock,
  addPageComment: addPageCommentMock,
  addBlockComment: addBlockCommentMock,
}));

mock.module("../../../notion/client", () => ({
  createNotionClient: () => ({}),
}));

import { getHandler } from "../../handler-registry";
import "../notion";

const handler = getHandler("notion");

const credentials = { accessToken: "ntn_token", config: {} };

function run(actionId: string, params: Record<string, unknown>) {
  if (!handler) {
    throw new Error("notion handler not registered");
  }
  return handler.execute(actionId, params, credentials, "conn_1");
}

function resetMocks() {
  for (const m of [
    listDatabasesMock,
    searchPagesMock,
    createPageMock,
    updatePageMock,
    archivePageMock,
    restorePageMock,
    getPageMock,
    queryDatabaseMock,
    createDatabaseEntryMock,
    updateDatabaseEntryMock,
    appendParagraphMock,
    updateBlockMock,
    deleteBlockMock,
    addPageCommentMock,
    addBlockCommentMock,
  ]) {
    m.mockClear();
  }
}

describe("notion handler", () => {
  beforeEach(resetMocks);

  it("registers with 15 actions", () => {
    expect(handler).toBeDefined();
    expect(handler?.supportedActions).toHaveLength(15);
  });

  it("rejects unknown action", async () => {
    const r = await run("nonexistent", {});
    expect(r.success).toBe(false);
    expect(r.error).toContain("Unsupported Notion");
  });

  describe("database_list", () => {
    it("returns databases", async () => {
      const r = await run("database_list", {});
      expect(r.success).toBe(true);
      expect(r.data.databases).toHaveLength(1);
    });

    it("passes custom limit", async () => {
      await run("database_list", { limit: 5 });
      expect(listDatabasesMock).toHaveBeenCalledWith(expect.anything(), 5);
    });
  });

  describe("page_search", () => {
    it("searches pages by query", async () => {
      const r = await run("page_search", { query: "hello" });
      expect(r.success).toBe(true);
      expect(r.data.pages).toHaveLength(1);
    });
  });

  describe("page_get", () => {
    it("returns page details", async () => {
      const r = await run("page_get", { pageId: "p1" });
      expect(r.success).toBe(true);
      expect(r.data).toEqual({ pageId: "p1", url: "https://notion.so/p1" });
    });

    it("throws when page not found", async () => {
      getPageMock.mockImplementationOnce(() => Promise.resolve(null));
      await expect(run("page_get", { pageId: "p_bad" })).rejects.toThrow(
        "Page not found"
      );
    });
  });

  describe("page_create", () => {
    it("creates a page under a parent", async () => {
      const r = await run("page_create", {
        parentId: "p0",
        title: "New",
        content: "body",
      });
      expect(r.success).toBe(true);
      expect(r.data).toEqual({ pageId: "p2", url: "https://notion.so/p2" });
    });

    it("defaults parentType to page", async () => {
      await run("page_create", { parentId: "p0", title: "X" });
      expect(createPageMock).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ parentType: "page" })
      );
    });
  });

  describe("page_update", () => {
    it("updates page properties", async () => {
      const r = await run("page_update", {
        pageId: "p1",
        properties: { Status: "Done" },
      });
      expect(r.success).toBe(true);
      expect(r.data).toEqual({ pageId: "p1", url: "https://notion.so/p1" });
    });
  });

  describe("page_archive / page_restore", () => {
    it("archives a page", async () => {
      const r = await run("page_archive", { pageId: "p1" });
      expect(r.success).toBe(true);
      expect(r.data).toEqual({ pageId: "p1" });
    });

    it("restores a page", async () => {
      const r = await run("page_restore", { pageId: "p1" });
      expect(r.success).toBe(true);
      expect(r.data).toEqual({ pageId: "p1" });
    });
  });

  describe("database_query", () => {
    it("queries a database", async () => {
      const r = await run("database_query", { databaseId: "db1" });
      expect(r.success).toBe(true);
      expect(r.data.results).toHaveLength(2);
      expect(r.data.total).toBe(2);
    });

    it("passes filter and sorts", async () => {
      await run("database_query", {
        databaseId: "db1",
        filter: { property: "Status" },
        sorts: [{ property: "Created", direction: "descending" }],
        pageSize: 10,
      });
      expect(queryDatabaseMock).toHaveBeenCalledWith(
        expect.anything(),
        "db1",
        expect.objectContaining({ pageSize: 10 })
      );
    });
  });

  describe("database_entry_create", () => {
    it("creates an entry", async () => {
      const r = await run("database_entry_create", {
        databaseId: "db1",
        properties: { Name: "Task 1" },
      });
      expect(r.success).toBe(true);
      expect(r.data).toMatchObject({ databaseId: "db1", pageId: "p3" });
    });
  });

  describe("database_entry_update", () => {
    it("updates an entry", async () => {
      const r = await run("database_entry_update", {
        pageId: "p3",
        properties: { Status: "Done" },
      });
      expect(r.success).toBe(true);
    });
  });

  describe("block operations", () => {
    it("appends a paragraph block", async () => {
      const r = await run("block_append", { parentId: "p1", text: "hello" });
      expect(r.success).toBe(true);
      expect(r.data).toEqual({ blockIds: ["b1"] });
    });

    it("updates a block", async () => {
      const r = await run("block_update", {
        blockId: "b1",
        content: { type: "paragraph" },
      });
      expect(r.success).toBe(true);
      expect(r.data).toEqual({ blockId: "b1" });
    });

    it("deletes a block", async () => {
      const r = await run("block_delete", { blockId: "b1" });
      expect(r.success).toBe(true);
      expect(r.data).toEqual({ blockId: "b1" });
    });
  });

  describe("comments", () => {
    it("adds a page comment", async () => {
      const r = await run("comment_add_page", {
        pageId: "p1",
        content: "nice",
      });
      expect(r.success).toBe(true);
      expect(r.data).toEqual({ commentId: "c1" });
    });

    it("adds a block comment", async () => {
      const r = await run("comment_add_block", {
        blockId: "b1",
        discussionId: "disc1",
        content: "reply",
      });
      expect(r.success).toBe(true);
      expect(r.data).toEqual({ commentId: "c2" });
    });
  });

  describe("failure propagation", () => {
    it("propagates upstream failure", async () => {
      createPageMock.mockImplementationOnce(() =>
        Promise.resolve({ success: false, error: "insufficient permissions" })
      );
      const r = await run("page_create", { parentId: "p0", title: "X" });
      expect(r.success).toBe(false);
      expect(r.error).toBe("insufficient permissions");
    });
  });
});
