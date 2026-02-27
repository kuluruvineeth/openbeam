import { beforeEach, describe, expect, mock, test } from "bun:test";
import type { ToolContext } from "../../../types";

const setMock = mock(() => Promise.resolve());

mock.module("@openplane/redis", () => ({
  getSearchCache: () => ({
    set: setMock,
  }),
}));

import { overviewSearchTool } from "../search";

function createContext(overrides?: Partial<ToolContext>): ToolContext {
  return {
    teamId: "team-1",
    userId: "user-1",
    services: {
      search: {
        hybrid: mock(() => Promise.reject(new Error("not used"))),
        semantic: mock(() => Promise.reject(new Error("not used"))),
        keyword: mock(() => Promise.reject(new Error("not used"))),
        unified: mock(() => Promise.reject(new Error("not used"))),
        export: mock(() => Promise.reject(new Error("not used"))),
        save: mock(() => Promise.reject(new Error("not used"))),
      },
      rag: {
        answer: mock(() => Promise.reject(new Error("not used"))),
        synthesize: mock(() => Promise.reject(new Error("not used"))),
        analyzeQuery: mock(() => ({
          normalizedQuery: "",
          intent: "",
          entities: [],
          searchTerms: [],
        })),
        verifyGrounding: mock(() => ({
          isGrounded: true,
          overallScore: 1,
          confidence: "high",
          claims: [],
        })),
      },
      discovery: {
        getCapabilities: mock(() => Promise.reject(new Error("not used"))),
      },
      documents: {
        get: mock(() => Promise.resolve(null)),
        list: mock(() => Promise.resolve({ documents: [], total: 0 })),
        getChunks: mock(() => Promise.resolve([])),
        export: mock(() => Promise.reject(new Error("not used"))),
        share: mock(() => Promise.reject(new Error("not used"))),
      },
      connectors: {
        list: mock(() => Promise.resolve([])),
        get: mock(() => Promise.resolve(null)),
        getSyncHistory: mock(() => Promise.resolve([])),
        getSyncHistoryPaginated: mock(() =>
          Promise.resolve({
            entries: [],
            pagination: { total: 0, limit: 20, offset: 0, hasMore: false },
          })
        ),
        triggerSync: mock(() => Promise.reject(new Error("not used"))),
        getSyncJobStatus: mock(() => Promise.resolve(null)),
        pause: mock(() => Promise.reject(new Error("not used"))),
        resume: mock(() => Promise.reject(new Error("not used"))),
      },
      context: {
        storeVirtualFile: mock(() => ({
          fileId: "vf_1",
          name: "n",
          preview: "",
          tokenCount: 0,
        })),
        retrieveVirtualFile: mock(() => null),
        retrieveVirtualFileChunk: mock(() => null),
        listVirtualFiles: mock(() => []),
        deleteVirtualFile: mock(() => true),
      },
      analytics: {
        getSpreadsheetSchema: mock(() => Promise.reject(new Error("not used"))),
        generateSql: mock(() => Promise.reject(new Error("not used"))),
        executeQuery: mock(() => Promise.reject(new Error("not used"))),
      },
      preferences: {
        get: mock(() => Promise.reject(new Error("not used"))),
        update: mock(() => Promise.reject(new Error("not used"))),
      },
      storage: {
        list: mock(() => Promise.reject(new Error("not used"))),
        getSignedUrl: mock(() => Promise.reject(new Error("not used"))),
        exists: mock(() => Promise.reject(new Error("not used"))),
        getMetadata: mock(() => Promise.reject(new Error("not used"))),
      },
      media: {
        searchByText: mock(() => Promise.reject(new Error("not used"))),
        searchByImage: mock(() => Promise.reject(new Error("not used"))),
        getTranscript: mock(() => Promise.reject(new Error("not used"))),
        getTranscriptWithTimestamps: mock(() =>
          Promise.reject(new Error("not used"))
        ),
        getMetadata: mock(() => Promise.reject(new Error("not used"))),
        analyze: mock(() => Promise.reject(new Error("not used"))),
        getSummary: mock(() => Promise.reject(new Error("not used"))),
        getChapters: mock(() => Promise.reject(new Error("not used"))),
        getHighlights: mock(() => Promise.reject(new Error("not used"))),
      },
      integrations: {
        listAvailable: mock(() => Promise.reject(new Error("not used"))),
        getCapabilities: mock(() => Promise.reject(new Error("not used"))),
      },
      workspace: {
        getSchema: mock(() => Promise.reject(new Error("not used"))),
        generateSql: mock(() => Promise.reject(new Error("not used"))),
      },
    },
    ...overrides,
  };
}

describe("overviewSearchTool caching", () => {
  beforeEach(() => {
    setMock.mockReset();
  });

  test("caches document ids/scores for raw unified search items (type/data/relevance)", async () => {
    const ctx = createContext();
    ctx.services.search.unified = mock(() =>
      Promise.resolve({
        items: [
          {
            type: "document",
            data: {
              id: "doc-1",
              title: "Doc 1",
              content: "hello",
              url: "https://example.com/doc-1",
              connector_type: "slack",
            },
            relevance: 0.9,
          },
          {
            type: "media",
            data: {
              id: "media-1",
              title: "Media 1",
              transcript: "world",
              url: "https://example.com/media-1",
              connector_type: "youtube",
            },
            relevance: 0.8,
          },
        ],
        total: 2,
        queryTime: 10,
      })
    ) as unknown as ToolContext["services"]["search"]["unified"];

    const result = await overviewSearchTool.execute(
      { query: "q", limit: 10, includeDocuments: true, includeMedia: true },
      ctx
    );

    expect(result.success).toBe(true);
    expect(setMock).toHaveBeenCalledTimes(1);
    expect(setMock).toHaveBeenCalledWith(
      "team-1",
      "q",
      expect.objectContaining({
        documentIds: ["doc-1"],
        scores: { "doc-1": 0.9 },
        totalCount: 2,
        cachedAt: expect.any(Number),
      })
    );
  });

  test("caches document ids/scores for flat unified search items (id/relevanceScore)", async () => {
    const ctx = createContext();
    ctx.services.search.unified = mock(() =>
      Promise.resolve({
        items: [
          {
            id: "doc-2",
            type: "document",
            title: "Doc 2",
            content: "hello",
            url: "https://example.com/doc-2",
            connectorType: "slack",
            relevanceScore: 0.7,
          },
        ],
        total: 1,
        queryTime: 10,
      })
    ) as unknown as ToolContext["services"]["search"]["unified"];

    const result = await overviewSearchTool.execute(
      { query: "q2", limit: 10, includeDocuments: true, includeMedia: true },
      ctx
    );

    expect(result.success).toBe(true);
    expect(setMock).toHaveBeenCalledTimes(1);
    expect(setMock).toHaveBeenCalledWith(
      "team-1",
      "q2",
      expect.objectContaining({
        documentIds: ["doc-2"],
        scores: { "doc-2": 0.7 },
        totalCount: 1,
        cachedAt: expect.any(Number),
      })
    );
  });
});
