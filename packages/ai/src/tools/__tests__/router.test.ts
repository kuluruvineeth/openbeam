import { beforeEach, describe, expect, it, mock } from "bun:test";
import type { ToolMetadata } from "@openbeam/types/ai";

import { createCompositionTracker } from "../../observability/composition";
import { toolRegistry } from "../registry";
import { ToolRouter } from "../router";

const createMockSearchService = () => ({
  initialize: mock(() => Promise.resolve()),
  search: mock(() =>
    Promise.resolve([
      {
        name: "search_hybrid",
        description: "Search documents",
        category: "search",
      },
      { name: "doc_get", description: "Get document", category: "documents" },
      { name: "rag_answer", description: "Answer questions", category: "rag" },
    ] as ToolMetadata[])
  ),
  invalidate: mock(),
  isInitialized: mock(() => true),
});

describe("ToolRouter", () => {
  let router: ToolRouter;
  let mockSearchService: ReturnType<typeof createMockSearchService>;

  beforeEach(() => {
    toolRegistry.clear();
    mockSearchService = createMockSearchService();

    router = new ToolRouter({
      searchService: mockSearchService as never,
    });
  });

  describe("initialize", () => {
    it("initializes the search service", async () => {
      await router.initialize();

      expect(mockSearchService.initialize).toHaveBeenCalled();
    });

    it("only initializes once", async () => {
      await router.initialize();
      await router.initialize();

      expect(mockSearchService.initialize).toHaveBeenCalledTimes(1);
    });

    it("sets search service on registry", async () => {
      await router.initialize();

      await toolRegistry.search({ query: "test" });
      expect(mockSearchService.search).toHaveBeenCalled();
    });
  });

  describe("route", () => {
    it("returns tools matching query", async () => {
      const result = await router.route("search documents");

      expect(result.tools.length).toBeGreaterThan(0);
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.reasoning).toBeDefined();
    });

    it("filters by category when provided", async () => {
      mockSearchService.search = mock(() =>
        Promise.resolve([
          {
            name: "search_hybrid",
            description: "Search",
            category: "search",
          },
          { name: "doc_get", description: "Get doc", category: "documents" },
        ] as ToolMetadata[])
      );

      const result = await router.route("test", { category: "search" });

      expect(result.tools.every((t) => t.category === "search")).toBe(true);
    });

    it("respects limit parameter", async () => {
      const result = await router.route("test", { limit: 1 });

      expect(result.tools.length).toBeLessThanOrEqual(1);
    });

    it("returns confidence score", async () => {
      const result = await router.route("search");

      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });

    it("generates reasoning for results", async () => {
      const result = await router.route("search documents");

      expect(result.reasoning).toContain("Found");
    });
  });

  describe("findBestTool", () => {
    it("returns single best matching tool", async () => {
      const tool = await router.findBestTool("search");

      expect(tool).not.toBeNull();
      expect(tool?.name).toBeDefined();
    });

    it("returns null when no tools match", async () => {
      mockSearchService.search = mock(() => Promise.resolve([]));

      const tool = await router.findBestTool("nonexistent");

      expect(tool).toBeNull();
    });
  });

  describe("findToolsForCapability", () => {
    beforeEach(() => {
      toolRegistry.register(
        {
          name: "search_hybrid",
          description: "Search capability",
          category: "search",
        } as ToolMetadata,
        { execute: mock() } as never
      );
    });

    it("finds tools matching capability", async () => {
      const tools = await router.findToolsForCapability("search");

      expect(tools.some((t) => t.name === "search_hybrid")).toBe(true);
    });
  });

  describe("suggestNextTools", () => {
    beforeEach(() => {
      toolRegistry.register(
        {
          name: "search_hybrid",
          description: "Search",
          category: "search",
          deferLoading: false,
        } as ToolMetadata,
        { execute: mock() } as never
      );
      toolRegistry.register(
        {
          name: "search_semantic",
          description: "Semantic search",
          category: "search",
          deferLoading: false,
        } as ToolMetadata,
        { execute: mock() } as never
      );
    });

    it("suggests tools based on recent usage", async () => {
      const suggestions = await router.suggestNextTools(["search_hybrid"]);

      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions[0]).toHaveProperty("tool");
      expect(suggestions[0]).toHaveProperty("reason");
      expect(suggestions[0]).toHaveProperty("score");
    });

    it("provides reason for each suggestion", async () => {
      const suggestions = await router.suggestNextTools(["search_hybrid"]);

      expect(suggestions.every((s) => s.reason.length > 0)).toBe(true);
    });
  });

  describe("getToolsForWorkflow", () => {
    it("returns diverse tools for workflow", async () => {
      mockSearchService.search = mock(() =>
        Promise.resolve([
          { name: "search_1", description: "Search", category: "search" },
          { name: "search_2", description: "Search 2", category: "search" },
          { name: "doc_1", description: "Doc", category: "documents" },
          { name: "rag_1", description: "RAG", category: "rag" },
        ] as ToolMetadata[])
      );

      const tools = await router.getToolsForWorkflow("research task");

      expect(tools.length).toBeLessThanOrEqual(5);

      const categories = new Set(tools.map((t) => t.category));
      expect(categories.size).toBeGreaterThanOrEqual(1);
    });

    it("prioritizes higher priority categories", async () => {
      mockSearchService.search = mock(() =>
        Promise.resolve([
          { name: "system_tool", description: "System", category: "system" },
          { name: "search_tool", description: "Search", category: "search" },
        ] as ToolMetadata[])
      );

      const tools = await router.getToolsForWorkflow("test");

      if (tools.length >= 2) {
        const searchIndex = tools.findIndex((t) => t.category === "search");
        const systemIndex = tools.findIndex((t) => t.category === "system");

        if (searchIndex !== -1 && systemIndex !== -1) {
          expect(searchIndex).toBeLessThan(systemIndex);
        }
      }
    });
  });

  describe("category boosts", () => {
    it("applies category boosts to results", async () => {
      const routerWithBoosts = new ToolRouter({
        searchService: mockSearchService as never,
        categoryBoosts: {
          documents: 0.5,
        },
      });

      mockSearchService.search = mock(() =>
        Promise.resolve([
          { name: "search_tool", description: "Search", category: "search" },
          { name: "doc_tool", description: "Doc", category: "documents" },
        ] as ToolMetadata[])
      );

      const result = await routerWithBoosts.route("test");

      expect(result.tools.length).toBeGreaterThan(0);
    });
  });

  describe("composition tracker integration", () => {
    it("sets composition tracker on registry during initialize", async () => {
      const tracker = createCompositionTracker();
      const routerWithTracker = new ToolRouter({
        searchService: mockSearchService as never,
        compositionTracker: tracker,
      });

      await routerWithTracker.initialize();

      expect(toolRegistry.getCompositionTracker()).toBe(tracker);
    });
  });

  describe("route result confidence", () => {
    it("returns 0 confidence for no results", async () => {
      mockSearchService.search = mock(() => Promise.resolve([]));

      const result = await router.route("test");

      expect(result.confidence).toBe(0);
    });

    it("returns higher confidence for matching keywords", async () => {
      mockSearchService.search = mock(() =>
        Promise.resolve([
          {
            name: "search_hybrid",
            description: "Search for documents",
            category: "search",
          },
        ] as ToolMetadata[])
      );

      const result = await router.route("search documents");

      expect(result.confidence).toBeGreaterThan(0);
    });
  });

  describe("route result reasoning", () => {
    it("indicates no tools found when empty", async () => {
      mockSearchService.search = mock(() => Promise.resolve([]));

      const result = await router.route("xyz123");

      expect(result.reasoning).toContain("No tools found");
    });

    it("describes found tools in reasoning", async () => {
      const result = await router.route("search");

      expect(result.reasoning).toContain("Found");
    });
  });
});
