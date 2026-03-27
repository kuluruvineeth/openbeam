import { beforeEach, describe, expect, it, mock } from "bun:test";
import type { ContextEntryDocument } from "@openbeam/vespa";

type SearchHit = {
  id: string;
  relevance: number;
  document: ContextEntryDocument;
};

type SearchResult = {
  hits: SearchHit[];
  totalCount: number;
  metrics: Record<string, unknown>;
};

const now = Date.now();

function makeHit(
  uri: string,
  relevance: number,
  overrides: {
    isLeaf?: boolean;
    contextType?: string;
    category?: string;
    activeCount?: number;
  } = {}
): SearchHit {
  return {
    id: uri,
    relevance,
    document: {
      id: uri,
      uri,
      parent_uri: "",
      team_id: "team-1",
      owner_id: "user-1",
      owner_type: "user",
      context_type: overrides.contextType ?? "resource",
      category: overrides.category,
      is_leaf: overrides.isLeaf ?? true,
      abstract_text: `Abstract for ${uri}`,
      active_count: overrides.activeCount ?? 5,
      updated_at: now,
      created_at: now,
    },
  };
}

function result(hits: SearchHit[] = []): Promise<SearchResult> {
  return Promise.resolve({ hits, totalCount: hits.length, metrics: {} });
}

const mockSearchContext = mock(() => result());
const mockSearchContextChildren = mock(() => result());

const mockBatchGetHotness = mock(() =>
  Promise.resolve(new Map<string, number>())
);
const mockCache = {
  batchGetHotness: mockBatchGetHotness,
  getL0: mock(() => Promise.resolve(null)),
  setL0: mock(() => Promise.resolve()),
  invalidateL0: mock(() => Promise.resolve()),
  incrementHotness: mock(() => Promise.resolve(1)),
  getHotness: mock(() => Promise.resolve(0)),
  invalidateTeam: mock(() => Promise.resolve()),
  mgetL0: mock(() => Promise.resolve(new Map())),
};

type AnyFn = (...args: unknown[]) => unknown;

mock.module("@openbeam/vespa", () => ({
  searchContext: (...a: unknown[]) =>
    (mockSearchContext as AnyFn).apply(null, a),
  searchContextChildren: (...a: unknown[]) =>
    (mockSearchContextChildren as AnyFn).apply(null, a),
  searchContextByUri: mock(() => Promise.resolve(null)),
}));

mock.module("@openbeam/redis", () => ({
  getContextCache: () => mockCache,
}));

const { HierarchicalRetriever, setsEqual } = await import("../retriever");

describe("setsEqual", () => {
  it("returns true for identical sets", () => {
    expect(setsEqual(new Set(["a", "b"]), new Set(["a", "b"]))).toBe(true);
  });

  it("returns false for different sizes", () => {
    expect(setsEqual(new Set(["a"]), new Set(["a", "b"]))).toBe(false);
  });

  it("returns false for same size but different items", () => {
    expect(setsEqual(new Set(["a", "b"]), new Set(["a", "c"]))).toBe(false);
  });

  it("returns true for two empty sets", () => {
    expect(setsEqual(new Set(), new Set())).toBe(true);
  });
});

describe("HierarchicalRetriever", () => {
  let retriever: InstanceType<typeof HierarchicalRetriever>;

  beforeEach(() => {
    retriever = new HierarchicalRetriever();
    mockSearchContext.mockReset();
    mockSearchContextChildren.mockReset();
    mockBatchGetHotness.mockReset();
    mockSearchContext.mockImplementation(() => result());
    mockSearchContextChildren.mockImplementation(() => result());
    mockBatchGetHotness.mockImplementation(() =>
      Promise.resolve(new Map<string, number>())
    );
  });

  describe("search", () => {
    it("returns empty categorized results when no directories found", async () => {
      const searchResult = await retriever.search({
        query: "test",
        teamId: "team-1",
      });

      expect(searchResult.resources).toHaveLength(0);
      expect(searchResult.memories).toHaveLength(0);
      expect(searchResult.skills).toHaveLength(0);
      expect(searchResult.tools).toHaveLength(0);
      expect(searchResult.total).toBe(0);
      expect(searchResult.retrievalPath).toHaveLength(1);
      expect(searchResult.retrievalPath[0]).toBe("global:0 directories");
    });

    it("categorizes results by contextType", async () => {
      const dirHit = makeHit("openbeam://resources/team-1/", 0.9, {
        isLeaf: false,
      });

      mockSearchContext.mockImplementation(() => result([dirHit]));

      mockSearchContextChildren.mockImplementation(() =>
        result([
          makeHit("openbeam://resources/team-1/doc-1", 0.8, {
            contextType: "resource",
          }),
          makeHit("openbeam://resources/team-1/mem-1", 0.7, {
            contextType: "memory",
          }),
          makeHit("openbeam://resources/team-1/skill-1", 0.6, {
            contextType: "skill",
          }),
          makeHit("openbeam://resources/team-1/tool-1", 0.5, {
            contextType: "tool",
          }),
        ])
      );

      const searchResult = await retriever.search({
        query: "test",
        teamId: "team-1",
      });

      expect(searchResult.resources.length).toBeGreaterThanOrEqual(1);
      expect(searchResult.memories.length).toBeGreaterThanOrEqual(1);
      expect(searchResult.skills.length).toBeGreaterThanOrEqual(1);
      expect(searchResult.tools.length).toBeGreaterThanOrEqual(1);
      expect(searchResult.total).toBe(4);
    });

    it("applies score propagation from parent to child", async () => {
      const dirHit = makeHit("openbeam://dir/", 0.6, { isLeaf: false });
      const childHit = makeHit("openbeam://dir/leaf", 0.8, {
        contextType: "resource",
      });

      mockSearchContext.mockImplementation(() => result([dirHit]));
      mockSearchContextChildren.mockImplementation(() => result([childHit]));
      mockBatchGetHotness.mockImplementation(() =>
        Promise.resolve(new Map([["openbeam://dir/leaf", 5]]))
      );

      const searchResult = await retriever.search({
        query: "test",
        teamId: "team-1",
      });

      expect(searchResult.resources).toHaveLength(1);
      const resource = searchResult
        .resources[0] as (typeof searchResult.resources)[0];
      expect(resource).toBeDefined();
      expect(resource.score).not.toBe(0.8);
    });

    it("converges after 3 unchanged rounds", async () => {
      const dirs = Array.from({ length: 10 }, (_, i) =>
        makeHit(`openbeam://dir-${i}/`, 0.9 - i * 0.05, { isLeaf: false })
      );

      mockSearchContext.mockImplementation(() => result(dirs));

      const leafHit = makeHit("openbeam://dir-0/leaf", 0.95, {
        contextType: "resource",
      });
      mockSearchContextChildren.mockImplementation(() => result([leafHit]));

      const searchResult = await retriever.search({
        query: "test",
        teamId: "team-1",
      });

      const traverseSteps = searchResult.retrievalPath.filter((p) =>
        p.startsWith("traverse:")
      );
      expect(traverseSteps.length).toBeLessThanOrEqual(6);
    });

    it("blends hotness into final score", async () => {
      const dirHit = makeHit("openbeam://dir/", 0.9, { isLeaf: false });
      const leafHit = makeHit("openbeam://dir/hot-leaf", 0.5, {
        contextType: "resource",
        activeCount: 100,
      });

      mockSearchContext.mockImplementation(() => result([dirHit]));
      mockSearchContextChildren.mockImplementation(() => result([leafHit]));
      mockBatchGetHotness.mockImplementation(() =>
        Promise.resolve(new Map([["openbeam://dir/hot-leaf", 100]]))
      );

      const searchResult = await retriever.search({
        query: "test",
        teamId: "team-1",
      });

      expect(searchResult.resources).toHaveLength(1);
      const hotResource = searchResult
        .resources[0] as (typeof searchResult.resources)[0];
      expect(hotResource.score).toBeGreaterThan(0);
    });

    it("respects limit parameter", async () => {
      const dirHit = makeHit("openbeam://dir/", 0.9, { isLeaf: false });
      const leaves = Array.from({ length: 5 }, (_, i) =>
        makeHit(`openbeam://dir/leaf-${i}`, 0.9 - i * 0.1, {
          contextType: "resource",
        })
      );

      mockSearchContext.mockImplementation(() => result([dirHit]));
      mockSearchContextChildren.mockImplementation(() => result(leaves));

      const searchResult = await retriever.search({
        query: "test",
        teamId: "team-1",
        limit: 2,
      });

      expect(searchResult.total).toBe(2);
    });
  });

  describe("find", () => {
    it("returns flat results from searchContext", async () => {
      const hits = [
        makeHit("openbeam://doc-1", 0.9, { contextType: "resource" }),
        makeHit("openbeam://doc-2", 0.7, { contextType: "memory" }),
      ];

      mockSearchContext.mockImplementation(() => result(hits));

      const results = await retriever.find("test query", "team-1");

      expect(results).toHaveLength(2);
      const first = results[0] as (typeof results)[0];
      const second = results[1] as (typeof results)[0];
      expect(first.uri).toBe("openbeam://doc-1");
      expect(first.score).toBe(0.9);
      expect(second.contextType).toBe("memory");
    });

    it("passes contextType filter to searchContext", async () => {
      await retriever.find("test", "team-1", { contextType: "skill" });

      expect(mockSearchContext).toHaveBeenCalledWith(
        expect.objectContaining({ contextType: "skill" })
      );
    });

    it("returns empty array when no results", async () => {
      const results = await retriever.find("nothing", "team-1");
      expect(results).toHaveLength(0);
    });
  });
});
