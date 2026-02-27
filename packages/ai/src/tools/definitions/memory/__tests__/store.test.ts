import { afterEach, describe, expect, it, mock } from "bun:test";
import type { PersistentMemory } from "../../../../memory/persistent";
import type { ToolContext } from "../../../types";
import { memoryStoreTool, setPersistentMemoryForStore } from "../store";

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

describe("memoryStoreTool", () => {
  afterEach(() => {
    setPersistentMemoryForStore(null as unknown as PersistentMemory);
  });

  describe("metadata", () => {
    it("has correct name", () => {
      expect(memoryStoreTool.metadata.name).toBe("memory_store");
    });

    it("has data category", () => {
      expect(memoryStoreTool.metadata.category).toBe("data");
    });

    it("requires memory:write permission", () => {
      expect(memoryStoreTool.metadata.requiredPermissions).toContain(
        "memory:write"
      );
    });

    it("includes search keywords", () => {
      const keywords = memoryStoreTool.metadata.searchKeywords;
      expect(keywords).toContain("memory");
      expect(keywords).toContain("store");
      expect(keywords).toContain("remember");
    });
  });

  describe("execute", () => {
    it("fails when persistent memory is not initialized", async () => {
      const result = await memoryStoreTool.execute(
        { content: "test", importance: "medium" },
        createTestContext()
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("INVALID_STATE");
    });

    it("stores content and returns entry id", async () => {
      const mockMemory = createMockPersistentMemory({
        store: mock(() => Promise.resolve("entry_42")),
      });
      setPersistentMemoryForStore(mockMemory);

      const result = await memoryStoreTool.execute(
        {
          content: "Deploy to us-east-1 region",
          tags: ["infrastructure", "aws"],
          source: "user",
          importance: "high",
        },
        createTestContext()
      );

      expect(result.success).toBe(true);
      const data = result.data as {
        id: string;
        stored: boolean;
        content: string;
        tags: string[];
        importance: string;
      };
      expect(data.id).toBe("entry_42");
      expect(data.stored).toBe(true);
      expect(data.content).toBe("Deploy to us-east-1 region");
      expect(data.tags).toEqual(["infrastructure", "aws"]);
      expect(data.importance).toBe("high");
    });

    it("passes all params to persistent memory", async () => {
      const mockMemory = createMockPersistentMemory();
      setPersistentMemoryForStore(mockMemory);

      await memoryStoreTool.execute(
        {
          content: "Use TypeScript strict mode",
          tags: ["coding"],
          source: "agent",
          importance: "low",
        },
        createTestContext()
      );

      expect(mockMemory.store).toHaveBeenCalledWith({
        content: "Use TypeScript strict mode",
        tags: ["coding"],
        source: "agent",
        importance: "low",
      });
    });

    it("defaults tags to empty array in response when omitted", async () => {
      const mockMemory = createMockPersistentMemory();
      setPersistentMemoryForStore(mockMemory);

      const result = await memoryStoreTool.execute(
        { content: "Simple note", importance: "medium" },
        createTestContext()
      );

      expect(result.success).toBe(true);
      const data = result.data as { tags: string[] };
      expect(data.tags).toEqual([]);
    });
  });
});
