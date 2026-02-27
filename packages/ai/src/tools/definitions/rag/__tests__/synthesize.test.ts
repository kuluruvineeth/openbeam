import { describe, expect, it, mock } from "bun:test";
import type { ToolServices } from "../../../services";
import type { ToolContext } from "../../../types";
import { ragSynthesizeTool } from "../synthesize";

function createMockSynthesizeResponse() {
  return {
    answer: "The vacation policy allows 20 days of PTO per year.",
    citations: [
      {
        documentId: "doc_1",
        chunkIndex: 0,
        snippet: "Employees receive 20 days of PTO.",
        relevance: 0.95,
      },
    ],
    usage: { promptTokens: 500, completionTokens: 100, totalTokens: 600 },
    latencyMs: 150,
  };
}

function createMockServices(
  overrides: Partial<ToolServices["rag"]> = {}
): ToolServices {
  const notUsed = () => {
    throw new Error("not used");
  };
  return {
    rag: {
      answer: notUsed,
      synthesize: mock(() => Promise.resolve(createMockSynthesizeResponse())),
      analyzeQuery: notUsed,
      verifyGrounding: notUsed,
      ...overrides,
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
    discovery: {
      getCapabilities: notUsed,
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

describe("ragSynthesizeTool", () => {
  describe("successful synthesis", () => {
    it("synthesizes answer from chunks", async () => {
      const services = createMockServices();
      const ctx = createTestContext(services);

      const result = await ragSynthesizeTool.execute(
        {
          question: "What is the vacation policy?",
          chunks: [
            {
              content: "Employees receive 20 days of PTO.",
              documentId: "doc_1",
              documentTitle: "HR Policy",
            },
          ],
          temperature: 0.3,
          maxOutputTokens: 1000,
        },
        ctx
      );

      expect(result.success).toBe(true);
      expect(result.data?.answer).toContain("vacation policy");
      expect(result.data?.usage).toBeDefined();
      expect(result.data?.usage?.totalTokens).toBe(600);
    });

    it("passes all parameters to service", async () => {
      const synthesizeMock = mock(() =>
        Promise.resolve({
          answer: "Answer",
          citations: [],
          usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
          latencyMs: 100,
        })
      );
      const services = createMockServices({ synthesize: synthesizeMock });
      const ctx = createTestContext(services);

      await ragSynthesizeTool.execute(
        {
          question: "What is the policy?",
          chunks: [
            {
              content: "Policy content here",
              documentId: "doc_1",
              documentTitle: "Policy Doc",
              documentUrl: "https://example.com/policy",
              position: 0,
            },
          ],
          temperature: 0.5,
          maxOutputTokens: 2000,
          instructions: "Be concise",
        },
        ctx
      );

      expect(synthesizeMock).toHaveBeenCalledWith({
        question: "What is the policy?",
        chunks: [
          {
            content: "Policy content here",
            documentId: "doc_1",
            documentTitle: "Policy Doc",
            documentUrl: "https://example.com/policy",
            position: 0,
          },
        ],
        temperature: 0.5,
        maxOutputTokens: 2000,
        instructions: "Be concise",
      });
    });
  });

  describe("authorization", () => {
    it("fails without team context", async () => {
      const services = createMockServices();
      const ctx = createTestContext(services, { teamId: "" });

      const result = await ragSynthesizeTool.execute(
        {
          question: "What is the policy?",
          chunks: [{ content: "Content", documentId: "doc_1" }],
          temperature: 0.3,
          maxOutputTokens: 1000,
        },
        ctx
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("UNAUTHORIZED");
    });
  });

  describe("validation", () => {
    it("fails with excessive content length", async () => {
      const services = createMockServices();
      const ctx = createTestContext(services);

      const largeContent = "x".repeat(101_000);
      const result = await ragSynthesizeTool.execute(
        {
          question: "What is the policy?",
          chunks: [{ content: largeContent, documentId: "doc_1" }],
          temperature: 0.3,
          maxOutputTokens: 1000,
        },
        ctx
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("INVALID_INPUT");
    });
  });

  describe("metadata", () => {
    it("includes latency and source in metadata", async () => {
      const services = createMockServices();
      const ctx = createTestContext(services);

      const result = await ragSynthesizeTool.execute(
        {
          question: "Test question",
          chunks: [{ content: "Test content", documentId: "doc_1" }],
          temperature: 0.3,
          maxOutputTokens: 1000,
        },
        ctx
      );

      expect(result.metadata?.latencyMs).toBeDefined();
      expect(result.metadata?.source).toBe("synthesizer");
    });
  });

  describe("tool metadata", () => {
    it("has correct name and category", () => {
      expect(ragSynthesizeTool.metadata.name).toBe("rag_synthesize");
      expect(ragSynthesizeTool.metadata.category).toBe("rag");
    });
  });
});
