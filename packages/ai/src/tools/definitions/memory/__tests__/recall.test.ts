import { afterEach, describe, expect, it, mock } from "bun:test";
import type { PersistentMemory } from "../../../../memory/persistent";
import type { ToolContext } from "../../../types";
import { memoryRecallTool, setPersistentMemoryForRecall } from "../recall";

function createMockPersistentMemory(
  overrides?: Partial<PersistentMemory>
): PersistentMemory {
  return {
    store: mock(() => Promise.resolve("entry_1")),
    recall: mock(() => Promise.resolve([])),
    update: mock(() => Promise.resolve(true)),
    forget: mock(() => Promise.resolve(true)),
    forgetByQuery: mock(() => Promise.resolve(0)),
    get: mock(() => Promise.resolve(null)),
    list: mock(() => Promise.resolve([])),
    count: mock(() => Promise.resolve(0)),
    ...overrides,
  };
}

function createTestContext(teamId = "team_abc"): ToolContext {
  return {
    teamId,
    userId: "user_123",
    services: {} as never,
  };
}

describe("memoryRecallTool", () => {
  afterEach(() => {
    setPersistentMemoryForRecall(null as unknown as PersistentMemory);
  });

  describe("metadata", () => {
    it("has correct name", () => {
      expect(memoryRecallTool.metadata.name).toBe("memory_recall");
    });

    it("has data category", () => {
      expect(memoryRecallTool.metadata.category).toBe("data");
    });

    it("requires memory:read permission", () => {
      expect(memoryRecallTool.metadata.requiredPermissions).toContain(
        "memory:read"
      );
    });

    it("includes search keywords", () => {
      const keywords = memoryRecallTool.metadata.searchKeywords;
      expect(keywords).toContain("memory");
      expect(keywords).toContain("recall");
      expect(keywords).toContain("remember");
    });
  });

  describe("execute", () => {
    it("fails when persistent memory is not initialized", async () => {
      const result = await memoryRecallTool.execute(
        { query: "test", limit: 10, minRelevance: 0.3 },
        createTestContext()
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("INVALID_STATE");
    });

    it("passes teamId from context to recall", async () => {
      const mockMemory = createMockPersistentMemory();
      setPersistentMemoryForRecall(mockMemory);

      await memoryRecallTool.execute(
        { query: "project decisions", limit: 10, minRelevance: 0.3 },
        createTestContext("team_xyz")
      );

      expect(mockMemory.recall).toHaveBeenCalledWith(
        expect.objectContaining({ teamId: "team_xyz" })
      );
    });

    it("passes query and tags to recall", async () => {
      const mockMemory = createMockPersistentMemory();
      setPersistentMemoryForRecall(mockMemory);

      await memoryRecallTool.execute(
        {
          query: "deployment strategy",
          tags: ["infrastructure", "devops"],
          limit: 5,
          minRelevance: 0.5,
        },
        createTestContext()
      );

      expect(mockMemory.recall).toHaveBeenCalledWith({
        query: "deployment strategy",
        teamId: "team_abc",
        tags: ["infrastructure", "devops"],
        limit: 5,
        minRelevance: 0.5,
      });
    });

    it("clamps limit to 1-50 range", async () => {
      const mockMemory = createMockPersistentMemory();
      setPersistentMemoryForRecall(mockMemory);

      await memoryRecallTool.execute(
        { query: "test", limit: 100, minRelevance: 0.3 },
        createTestContext()
      );

      expect(mockMemory.recall).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 50 })
      );

      await memoryRecallTool.execute(
        { query: "test", limit: -5, minRelevance: 0.3 },
        createTestContext()
      );

      expect(mockMemory.recall).toHaveBeenLastCalledWith(
        expect.objectContaining({ limit: 1 })
      );
    });

    it("clamps minRelevance to 0-1 range", async () => {
      const mockMemory = createMockPersistentMemory();
      setPersistentMemoryForRecall(mockMemory);

      await memoryRecallTool.execute(
        { query: "test", limit: 10, minRelevance: 2.0 },
        createTestContext()
      );

      expect(mockMemory.recall).toHaveBeenCalledWith(
        expect.objectContaining({ minRelevance: 1 })
      );
    });

    it("returns mapped entries on success", async () => {
      const mockMemory = createMockPersistentMemory({
        recall: mock(() =>
          Promise.resolve([
            {
              entry: {
                id: "entry_1",
                content: "Use Kubernetes for deployment",
                tags: ["infra"],
                source: "user",
                importance: "high" as const,
                createdAt: 1_700_000_000_000,
                accessedAt: 1_700_000_000_000,
                accessCount: 3,
                teamId: "team_abc",
                embedding: [],
                updatedAt: 1_700_000_000_000,
              },
              relevanceScore: 0.92,
              matchType: "semantic" as const,
            },
          ])
        ),
      });
      setPersistentMemoryForRecall(mockMemory);

      const result = await memoryRecallTool.execute(
        { query: "deployment", limit: 10, minRelevance: 0.3 },
        createTestContext()
      );

      expect(result.success).toBe(true);
      const data = result.data as {
        entries: Array<{
          id: string;
          content: string;
          tags: string[];
          importance: string;
          relevanceScore: number;
          matchType: string;
          createdAt: string;
          accessCount: number;
        }>;
        totalFound: number;
        query: string;
      };
      expect(data.totalFound).toBe(1);
      expect(data.query).toBe("deployment");
      const first = data.entries[0] as (typeof data.entries)[number];
      expect(first.id).toBe("entry_1");
      expect(first.content).toBe("Use Kubernetes for deployment");
      expect(first.relevanceScore).toBe(0.92);
      expect(first.matchType).toBe("semantic");
    });
  });
});
