import { describe, expect, it, mock } from "bun:test";
import type { ToolServices } from "../../../services";
import type { ToolContext } from "../../../types";
import { discoverCapabilitiesTool } from "../discover-capabilities";

function createMockCapabilities() {
  return {
    connectors: [
      {
        type: "slack",
        name: "Slack",
        status: "active",
        documentCount: 5000,
        lastSyncAt: new Date(),
      },
      {
        type: "notion",
        name: "Notion",
        status: "active",
        documentCount: 2000,
        lastSyncAt: new Date(),
      },
    ],
    tools: [
      {
        name: "search_hybrid",
        category: "search",
        description: "Hybrid search",
      },
      { name: "rag_answer", category: "rag", description: "RAG answer" },
    ],
    stats: {
      totalDocuments: 7000,
      totalConnectors: 2,
      activeConnectors: 2,
    },
  };
}

function createMockServices(
  overrides: Partial<ToolServices["discovery"]> = {}
): ToolServices {
  const notUsed = () => {
    throw new Error("not used");
  };
  return {
    discovery: {
      getCapabilities: mock(() => Promise.resolve(createMockCapabilities())),
      ...overrides,
    },
    rag: {
      answer: notUsed,
      synthesize: notUsed,
      analyzeQuery: notUsed,
      verifyGrounding: notUsed,
    },
    search: {
      hybrid: notUsed,
      semantic: notUsed,
      keyword: notUsed,
      unified: notUsed,
      export: notUsed,
      save: notUsed,
    },
    documents: {
      get: notUsed,
      list: notUsed,
      getChunks: notUsed,
      export: notUsed,
      share: notUsed,
    },
    connectors: {
      list: notUsed,
      get: notUsed,
      getSyncHistory: notUsed,
      getSyncHistoryPaginated: notUsed,
      triggerSync: notUsed,
      getSyncJobStatus: notUsed,
      pause: notUsed,
      resume: notUsed,
    },
    context: {
      storeVirtualFile: notUsed,
      retrieveVirtualFile: notUsed,
      retrieveVirtualFileChunk: notUsed,
      listVirtualFiles: notUsed,
      deleteVirtualFile: notUsed,
    },
    analytics: {
      getSpreadsheetSchema: notUsed,
      generateSql: notUsed,
      executeQuery: notUsed,
    },
    preferences: {
      get: notUsed,
      update: notUsed,
    },
    storage: {
      list: notUsed,
      getSignedUrl: notUsed,
      exists: notUsed,
      getMetadata: notUsed,
    },
    media: {
      searchByText: notUsed,
      searchByImage: notUsed,
      getTranscript: notUsed,
      getTranscriptWithTimestamps: notUsed,
      getMetadata: notUsed,
      analyze: notUsed,
      getSummary: notUsed,
      getChapters: notUsed,
      getHighlights: notUsed,
    },
    integrations: {
      listAvailable: notUsed,
      getCapabilities: notUsed,
    },
    workspace: {
      getSchema: notUsed,
      generateSql: notUsed,
    },
  };
}

function createTestContext(
  services: ToolServices,
  overrides: Partial<ToolContext> = {}
): ToolContext {
  return {
    teamId: "team_test",
    userId: "user_test",
    services,
    ...overrides,
  };
}

describe("discoverCapabilitiesTool", () => {
  describe("successful discovery", () => {
    it("returns connectors and stats when requested", async () => {
      const services = createMockServices();
      const ctx = createTestContext(services);

      const result = await discoverCapabilitiesTool.execute(
        { includeConnectors: true, includeStats: true, includeTools: false },
        ctx
      );

      expect(result.success).toBe(true);
      expect(result.data?.connectors).toBeDefined();
      expect(result.data?.connectors).toHaveLength(2);
      expect(result.data?.stats).toBeDefined();
      expect(result.data?.stats?.totalDocuments).toBe(7000);
    });

    it("includes tools when requested", async () => {
      const services = createMockServices();
      const ctx = createTestContext(services);

      const result = await discoverCapabilitiesTool.execute(
        { includeTools: true, includeConnectors: false, includeStats: false },
        ctx
      );

      expect(result.success).toBe(true);
      expect(result.data?.tools).toBeDefined();
      expect(Array.isArray(result.data?.tools)).toBe(true);
    });

    it("filters tools by category", async () => {
      const services = createMockServices();
      const ctx = createTestContext(services);

      const result = await discoverCapabilitiesTool.execute(
        {
          includeTools: true,
          toolCategory: "search",
          includeConnectors: false,
          includeStats: false,
        },
        ctx
      );

      expect(result.success).toBe(true);
      if (result.data?.tools && result.data.tools.length > 0) {
        expect(result.data.tools.every((t) => t.category === "search")).toBe(
          true
        );
      }
    });

    it("excludes connectors when disabled", async () => {
      const services = createMockServices();
      const ctx = createTestContext(services);

      const result = await discoverCapabilitiesTool.execute(
        { includeConnectors: false, includeTools: false, includeStats: true },
        ctx
      );

      expect(result.success).toBe(true);
      expect(result.data?.connectors).toBeUndefined();
    });

    it("excludes stats when disabled", async () => {
      const services = createMockServices();
      const ctx = createTestContext(services);

      const result = await discoverCapabilitiesTool.execute(
        { includeStats: false, includeTools: false, includeConnectors: true },
        ctx
      );

      expect(result.success).toBe(true);
      expect(result.data?.stats).toBeUndefined();
    });
  });

  describe("authorization", () => {
    it("fails without team context", async () => {
      const services = createMockServices();
      const ctx = createTestContext(services, { teamId: "" });

      const result = await discoverCapabilitiesTool.execute(
        { includeConnectors: true, includeTools: false, includeStats: false },
        ctx
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("UNAUTHORIZED");
    });
  });

  describe("metadata", () => {
    it("includes latency in metadata", async () => {
      const services = createMockServices();
      const ctx = createTestContext(services);

      const result = await discoverCapabilitiesTool.execute(
        { includeConnectors: true, includeTools: false, includeStats: false },
        ctx
      );

      expect(result.metadata?.latencyMs).toBeDefined();
      expect(typeof result.metadata?.latencyMs).toBe("number");
      expect(result.metadata?.source).toBe("capability-discovery");
    });
  });

  describe("connector details", () => {
    it("returns connector type and document counts", async () => {
      const services = createMockServices();
      const ctx = createTestContext(services);

      const result = await discoverCapabilitiesTool.execute(
        { includeConnectors: true, includeTools: false, includeStats: false },
        ctx
      );

      expect(result.success).toBe(true);
      const slackConnector = result.data?.connectors?.find(
        (c) => c.type === "slack"
      );
      expect(slackConnector).toBeDefined();
      expect(slackConnector?.documentCount).toBe(5000);
    });
  });

  describe("tool metadata", () => {
    it("has correct name and category", () => {
      expect(discoverCapabilitiesTool.metadata.name).toBe(
        "discover_capabilities"
      );
      expect(discoverCapabilitiesTool.metadata.category).toBe("system");
    });

    it("has search keywords", () => {
      expect(discoverCapabilitiesTool.metadata.searchKeywords).toContain(
        "discover"
      );
      expect(discoverCapabilitiesTool.metadata.searchKeywords).toContain(
        "capabilities"
      );
    });
  });
});
