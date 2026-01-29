import { beforeEach, describe, expect, it, mock, spyOn } from "bun:test";
import type { ToolMetadata } from "@openplane/types/ai";

import { createCompositionTracker } from "../../observability/composition";
import { ToolRegistry } from "../registry";
import type { ToolServices } from "../services";
import type { ToolContext } from "../types";

const createMockTool = (
  name: string,
  category: "search" | "rag" | "documents" = "search"
): {
  metadata: ToolMetadata;
  coreTool: { execute: ReturnType<typeof mock> };
} => ({
  metadata: {
    name,
    description: `${name} tool description`,
    category,
    searchKeywords: [name.toLowerCase()],
  },
  coreTool: {
    execute: mock(() =>
      Promise.resolve({ success: true, data: { result: name } })
    ),
  },
});

const createMockContext = (): ToolContext => ({
  teamId: "team_123",
  userId: "user_456",
  services: {} as ToolServices,
});

describe("ToolRegistry Enhanced Features", () => {
  let registry: ToolRegistry;

  beforeEach(() => {
    registry = new ToolRegistry();
  });

  describe("search", () => {
    beforeEach(() => {
      registry.register(
        createMockTool("search_hybrid", "search").metadata,
        createMockTool("search_hybrid", "search").coreTool as never
      );
      registry.register(
        createMockTool("search_semantic", "search").metadata,
        createMockTool("search_semantic", "search").coreTool as never
      );
      registry.register(
        createMockTool("doc_get", "documents").metadata,
        createMockTool("doc_get", "documents").coreTool as never
      );
      registry.register(
        createMockTool("rag_answer", "rag").metadata,
        createMockTool("rag_answer", "rag").coreTool as never
      );
    });

    it("returns tools matching query by name", async () => {
      const results = await registry.search({ query: "search", limit: 5 });

      expect(results.length).toBeGreaterThanOrEqual(2);
      expect(results.map((t) => t.name)).toContain("search_hybrid");
      expect(results.map((t) => t.name)).toContain("search_semantic");
    });

    it("filters by category", async () => {
      const results = await registry.search({
        query: "tool",
        category: "documents",
        limit: 5,
      });

      expect(results.every((t) => t.category === "documents")).toBe(true);
    });

    it("respects limit parameter", async () => {
      const results = await registry.search({ query: "tool", limit: 2 });

      expect(results.length).toBeLessThanOrEqual(2);
    });

    it("returns empty array when no matches", async () => {
      const results = await registry.search({
        query: "nonexistent_xyz_123",
        limit: 5,
      });

      expect(results).toEqual([]);
    });
  });

  describe("multiExecute", () => {
    let searchTool: ReturnType<typeof createMockTool>;
    let docTool: ReturnType<typeof createMockTool>;
    let ragTool: ReturnType<typeof createMockTool>;

    beforeEach(() => {
      searchTool = createMockTool("search_hybrid", "search");
      docTool = createMockTool("doc_get", "documents");
      ragTool = createMockTool("rag_answer", "rag");

      registry.register(searchTool.metadata, searchTool.coreTool as never);
      registry.register(docTool.metadata, docTool.coreTool as never);
      registry.register(ragTool.metadata, ragTool.coreTool as never);
    });

    it("executes multiple tools in parallel", async () => {
      const ctx = createMockContext();
      const result = await registry.multiExecute({
        tools: ["search_hybrid", "doc_get", "rag_answer"],
        inputs: [{ query: "test" }, { id: "doc_1" }, { query: "answer" }],
        ctx,
        parallel: true,
        maxConcurrency: 3,
      });

      expect(result.results.length).toBe(3);
      expect(result.parallelized).toBe(true);
      expect(result.totalLatencyMs).toBeGreaterThanOrEqual(0);
      expect(searchTool.coreTool.execute).toHaveBeenCalled();
      expect(docTool.coreTool.execute).toHaveBeenCalled();
      expect(ragTool.coreTool.execute).toHaveBeenCalled();
    });

    it("executes tools sequentially when parallel is false", async () => {
      const ctx = createMockContext();
      const result = await registry.multiExecute({
        tools: ["search_hybrid", "doc_get"],
        inputs: [{ query: "test" }, { id: "doc_1" }],
        ctx,
        parallel: false,
      });

      expect(result.results.length).toBe(2);
      expect(result.parallelized).toBe(false);
    });

    it("throws when tools and inputs count mismatch", async () => {
      const ctx = createMockContext();

      await expect(
        registry.multiExecute({
          tools: ["search_hybrid", "doc_get"],
          inputs: [{ query: "test" }],
          ctx,
        })
      ).rejects.toThrow("Tool count (2) must match input count (1)");
    });

    it("returns NOT_FOUND error for missing tools", async () => {
      const ctx = createMockContext();
      const result = await registry.multiExecute({
        tools: ["nonexistent_tool"],
        inputs: [{}],
        ctx,
      });

      expect(result.results[0]?.success).toBe(false);
      expect(result.results[0]?.error?.code).toBe("NOT_FOUND");
    });

    it("respects maxConcurrency", async () => {
      const ctx = createMockContext();

      const delayedTool = (name: string, delay: number) => {
        const tool = createMockTool(name, "search");
        tool.coreTool.execute = mock(async () => {
          await new Promise((r) => setTimeout(r, delay));
          return { success: true, data: {} };
        });
        return tool;
      };

      const tool1 = delayedTool("tool_1", 10);
      const tool2 = delayedTool("tool_2", 10);
      const tool3 = delayedTool("tool_3", 10);
      const tool4 = delayedTool("tool_4", 10);

      registry.register(tool1.metadata, tool1.coreTool as never);
      registry.register(tool2.metadata, tool2.coreTool as never);
      registry.register(tool3.metadata, tool3.coreTool as never);
      registry.register(tool4.metadata, tool4.coreTool as never);

      await registry.multiExecute({
        tools: ["tool_1", "tool_2", "tool_3", "tool_4"],
        inputs: [{}, {}, {}, {}],
        ctx,
        parallel: true,
        maxConcurrency: 2,
      });

      expect(tool1.coreTool.execute).toHaveBeenCalled();
      expect(tool2.coreTool.execute).toHaveBeenCalled();
      expect(tool3.coreTool.execute).toHaveBeenCalled();
      expect(tool4.coreTool.execute).toHaveBeenCalled();
    });

    it("returns empty results for empty input", async () => {
      const ctx = createMockContext();
      const result = await registry.multiExecute({
        tools: [],
        inputs: [],
        ctx,
      });

      expect(result.results).toEqual([]);
      expect(result.totalLatencyMs).toBe(0);
    });
  });

  describe("findByCapability", () => {
    beforeEach(() => {
      registry.register(
        {
          ...createMockTool("search_hybrid").metadata,
          description: "Search across all documents",
        },
        createMockTool("search_hybrid").coreTool as never
      );
      registry.register(
        {
          ...createMockTool("email_send").metadata,
          description: "Send email to recipients",
        },
        createMockTool("email_send").coreTool as never
      );
    });

    it("finds tools by name match", () => {
      const results = registry.findByCapability("search");

      expect(results.some((t) => t.name === "search_hybrid")).toBe(true);
    });

    it("finds tools by description match", () => {
      const results = registry.findByCapability("email");

      expect(results.some((t) => t.name === "email_send")).toBe(true);
    });

    it("is case insensitive", () => {
      const results = registry.findByCapability("SEARCH");

      expect(results.some((t) => t.name === "search_hybrid")).toBe(true);
    });
  });

  describe("suggestTools", () => {
    beforeEach(() => {
      registry.register(
        {
          ...createMockTool("search_hybrid", "search").metadata,
          deferLoading: false,
        },
        createMockTool("search_hybrid").coreTool as never
      );
      registry.register(
        {
          ...createMockTool("search_semantic", "search").metadata,
          deferLoading: false,
        },
        createMockTool("search_semantic").coreTool as never
      );
      registry.register(
        {
          ...createMockTool("doc_get", "documents").metadata,
          deferLoading: false,
        },
        createMockTool("doc_get").coreTool as never
      );
      registry.register(
        {
          ...createMockTool("deferred_tool", "rag").metadata,
          deferLoading: true,
        },
        createMockTool("deferred_tool").coreTool as never
      );
    });

    it("returns non-deferred tools when no context", () => {
      const results = registry.suggestTools({});

      expect(results.every((t) => !t.deferLoading)).toBe(true);
      expect(results.length).toBeLessThanOrEqual(5);
    });

    it("suggests tools from same category as recent tools", () => {
      const results = registry.suggestTools({ recentTools: ["search_hybrid"] });

      expect(results.some((t) => t.category === "search")).toBe(true);
      expect(results.every((t) => t.name !== "search_hybrid")).toBe(true);
    });

    it("falls back to default tools when no same-category tools available", () => {
      const results = registry.suggestTools({ recentTools: ["nonexistent"] });

      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe("composition tracking integration", () => {
    it("sets and gets composition tracker", () => {
      const tracker = createCompositionTracker();
      registry.setCompositionTracker(tracker);

      expect(registry.getCompositionTracker()).toBe(tracker);
    });

    it("records tool calls to composition tracker during multiExecute", async () => {
      const tracker = createCompositionTracker();
      const recordSpy = spyOn(tracker, "recordToolCall");

      registry.setCompositionTracker(tracker);

      const tool = createMockTool("test_tool", "search");
      registry.register(tool.metadata, tool.coreTool as never);

      await registry.multiExecute({
        tools: ["test_tool"],
        inputs: [{}],
        ctx: createMockContext(),
      });

      expect(recordSpy).toHaveBeenCalledWith("test_tool");
    });
  });

  describe("search service integration", () => {
    it("sets and uses custom search service", async () => {
      const mockSearchService = {
        search: mock(() =>
          Promise.resolve([
            {
              name: "custom_tool",
              description: "Custom",
              category: "search" as const,
            },
          ])
        ),
      };

      registry.setSearchService(mockSearchService);

      const results = await registry.search({ query: "test" });

      expect(mockSearchService.search).toHaveBeenCalledWith("test");
      expect(results).toHaveLength(1);
      expect(results[0]?.name).toBe("custom_tool");
    });
  });
});
