import { afterEach, describe, expect, it, mock } from "bun:test";
import type { PersistentMemory } from "../../../../memory/persistent";
import type { ToolContext } from "../../../types";
import { memoryForgetTool, setPersistentMemoryForForget } from "../forget";

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

function createTestContext(): ToolContext {
  return {
    teamId: "team_abc",
    userId: "user_123",
    services: {} as never,
  };
}

describe("memoryForgetTool", () => {
  afterEach(() => {
    setPersistentMemoryForForget(null as unknown as PersistentMemory);
  });

  describe("metadata", () => {
    it("has correct name", () => {
      expect(memoryForgetTool.metadata.name).toBe("memory_forget");
    });

    it("has data category", () => {
      expect(memoryForgetTool.metadata.category).toBe("data");
    });

    it("requires memory:write and memory:delete permissions", () => {
      const perms = memoryForgetTool.metadata.requiredPermissions;
      expect(perms).toContain("memory:write");
      expect(perms).toContain("memory:delete");
    });

    it("is marked as medium stakes and irreversible", () => {
      expect(memoryForgetTool.metadata.riskProfile?.stakes).toBe("medium");
      expect(memoryForgetTool.metadata.riskProfile?.reversibility).toBe(
        "irreversible"
      );
    });

    it("includes search keywords", () => {
      const keywords = memoryForgetTool.metadata.searchKeywords;
      expect(keywords).toContain("forget");
      expect(keywords).toContain("delete");
      expect(keywords).toContain("gdpr");
    });
  });

  describe("execute", () => {
    it("fails when persistent memory is not initialized", async () => {
      const result = await memoryForgetTool.execute(
        { id: "entry_1", limit: 10 },
        createTestContext()
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("INVALID_STATE");
    });

    it("fails when no id, query, or tags provided", async () => {
      const mockMemory = createMockPersistentMemory();
      setPersistentMemoryForForget(mockMemory);

      const result = await memoryForgetTool.execute(
        { limit: 10 },
        createTestContext()
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("INVALID_INPUT");
    });

    it("deletes by id when provided", async () => {
      const mockMemory = createMockPersistentMemory({
        forget: mock(() => Promise.resolve(true)),
      });
      setPersistentMemoryForForget(mockMemory);

      const result = await memoryForgetTool.execute(
        { id: "entry_42", limit: 10 },
        createTestContext()
      );

      expect(result.success).toBe(true);
      expect(mockMemory.forget).toHaveBeenCalledWith("entry_42");
      const data = result.data as { deleted: number; ids: string[] };
      expect(data.deleted).toBe(1);
      expect(data.ids).toEqual(["entry_42"]);
    });

    it("returns zero deleted when id not found", async () => {
      const mockMemory = createMockPersistentMemory({
        forget: mock(() => Promise.resolve(false)),
      });
      setPersistentMemoryForForget(mockMemory);

      const result = await memoryForgetTool.execute(
        { id: "nonexistent", limit: 10 },
        createTestContext()
      );

      expect(result.success).toBe(true);
      const data = result.data as { deleted: number; ids: string[] };
      expect(data.deleted).toBe(0);
      expect(data.ids).toEqual([]);
    });

    it("deletes by query when no id provided", async () => {
      const mockMemory = createMockPersistentMemory({
        forgetByQuery: mock(() => Promise.resolve(3)),
      });
      setPersistentMemoryForForget(mockMemory);

      const result = await memoryForgetTool.execute(
        { query: "outdated info", tags: ["old"], limit: 10 },
        createTestContext()
      );

      expect(result.success).toBe(true);
      expect(mockMemory.forgetByQuery).toHaveBeenCalledWith({
        query: "outdated info",
        tags: ["old"],
        limit: 10,
      });
      const data = result.data as { deleted: number };
      expect(data.deleted).toBe(3);
    });

    it("clamps limit to 1-100 range", async () => {
      const mockMemory = createMockPersistentMemory();
      setPersistentMemoryForForget(mockMemory);

      await memoryForgetTool.execute(
        { query: "test", limit: 500 },
        createTestContext()
      );

      expect(mockMemory.forgetByQuery).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 100 })
      );

      await memoryForgetTool.execute(
        { query: "test", limit: -5 },
        createTestContext()
      );

      expect(mockMemory.forgetByQuery).toHaveBeenLastCalledWith(
        expect.objectContaining({ limit: 1 })
      );
    });

    it("accepts tags-only deletion", async () => {
      const mockMemory = createMockPersistentMemory({
        forgetByQuery: mock(() => Promise.resolve(5)),
      });
      setPersistentMemoryForForget(mockMemory);

      const result = await memoryForgetTool.execute(
        { tags: ["deprecated"], limit: 10 },
        createTestContext()
      );

      expect(result.success).toBe(true);
      expect(mockMemory.forgetByQuery).toHaveBeenCalledWith({
        query: undefined,
        tags: ["deprecated"],
        limit: 10,
      });
    });
  });
});
