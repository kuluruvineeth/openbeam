import { describe, expect, it, mock } from "bun:test";
import type { ToolServices } from "../../../services";
import type { ToolContext } from "../../../types";
import { ragGroundTool } from "../ground";

function createMockServices(
  overrides: Partial<ToolServices["rag"]> = {}
): ToolServices {
  const notUsed = () => {
    throw new Error("not used");
  };
  return {
    rag: {
      answer: notUsed,
      synthesize: notUsed,
      analyzeQuery: notUsed,
      verifyGrounding: mock(() => ({
        isGrounded: true,
        overallScore: 0.9,
        confidence: "high" as const,
        claims: [
          {
            claim: "The company offers 20 days PTO",
            supported: true,
            confidence: 0.9,
            evidenceSnippet: "Employees receive 20 days of paid time off.",
          },
        ],
      })),
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

describe("ragGroundTool", () => {
  describe("successful grounding", () => {
    it("verifies strongly supported claim", async () => {
      const services = createMockServices({
        verifyGrounding: mock(() => ({
          isGrounded: true,
          overallScore: 0.9,
          confidence: "high" as const,
          claims: [
            {
              claim: "PTO is 20 days",
              supported: true,
              confidence: 0.9,
              evidenceSnippet: "20 days PTO annually",
            },
          ],
        })),
      });
      const ctx = createTestContext(services);

      const result = await ragGroundTool.execute(
        {
          claim: "The company offers 20 days PTO",
          evidence: [
            {
              documentId: "doc_1",
              content: "Employees receive 20 days of paid time off annually.",
              title: "HR Policy",
            },
          ],
          strictMode: false,
        },
        ctx
      );

      expect(result.success).toBe(true);
      expect(result.data?.supportLevel).toBe("strong");
      expect(result.data?.isGrounded).toBe(true);
      expect(result.data?.confidence).toBe(0.9);
    });

    it("detects weak support", async () => {
      const services = createMockServices({
        verifyGrounding: mock(() => ({
          isGrounded: true,
          overallScore: 0.6,
          confidence: "medium" as const,
          claims: [
            {
              claim: "PTO policy exists",
              supported: true,
              confidence: 0.6,
              evidenceSnippet: "Time off policy...",
            },
          ],
        })),
      });
      const ctx = createTestContext(services);

      const result = await ragGroundTool.execute(
        {
          claim: "There is a PTO policy",
          evidence: [
            { documentId: "doc_1", content: "Time off policy mentioned..." },
          ],
          strictMode: false,
        },
        ctx
      );

      expect(result.success).toBe(true);
      expect(result.data?.supportLevel).toBe("weak");
    });

    it("detects unsupported claim", async () => {
      const services = createMockServices({
        verifyGrounding: mock(() => ({
          isGrounded: false,
          overallScore: 0.2,
          confidence: "low" as const,
          claims: [
            { claim: "Unlimited PTO", supported: false, confidence: 0.2 },
          ],
        })),
      });
      const ctx = createTestContext(services);

      const result = await ragGroundTool.execute(
        {
          claim: "The company has unlimited PTO",
          evidence: [{ documentId: "doc_1", content: "20 days PTO allowed." }],
          strictMode: false,
        },
        ctx
      );

      expect(result.success).toBe(true);
      expect(result.data?.supportLevel).toBe("unsupported");
      expect(result.data?.isGrounded).toBe(false);
    });

    it("detects contradiction", async () => {
      const services = createMockServices({
        verifyGrounding: mock(() => ({
          isGrounded: false,
          overallScore: 0.1,
          confidence: "high" as const,
          claims: [
            {
              claim: "Unlimited PTO",
              supported: false,
              confidence: 0.9,
              evidenceSnippet: "Only 20 days allowed",
            },
          ],
        })),
      });
      const ctx = createTestContext(services);

      const result = await ragGroundTool.execute(
        {
          claim: "The company has unlimited PTO",
          evidence: [
            {
              documentId: "doc_1",
              content: "Employees receive exactly 20 days. No exceptions.",
            },
          ],
          strictMode: false,
        },
        ctx
      );

      expect(result.success).toBe(true);
      expect(result.data?.supportLevel).toBe("contradicted");
    });
  });

  describe("strict mode", () => {
    it("converts weak to unsupported in strict mode", async () => {
      const services = createMockServices({
        verifyGrounding: mock(() => ({
          isGrounded: true,
          overallScore: 0.6,
          confidence: "medium" as const,
          claims: [{ claim: "Claim", supported: true, confidence: 0.6 }],
        })),
      });
      const ctx = createTestContext(services);

      const result = await ragGroundTool.execute(
        {
          claim: "Some claim",
          evidence: [{ documentId: "doc_1", content: "Content" }],
          strictMode: true,
        },
        ctx
      );

      expect(result.success).toBe(true);
      expect(result.data?.supportLevel).toBe("unsupported");
      expect(result.data?.isGrounded).toBe(false);
    });

    it("requires higher threshold for grounded in strict mode", async () => {
      const services = createMockServices({
        verifyGrounding: mock(() => ({
          isGrounded: true,
          overallScore: 0.85,
          confidence: "high" as const,
          claims: [{ claim: "Claim", supported: true, confidence: 0.85 }],
        })),
      });
      const ctx = createTestContext(services);

      const result = await ragGroundTool.execute(
        {
          claim: "Some claim",
          evidence: [{ documentId: "doc_1", content: "Content" }],
          strictMode: true,
        },
        ctx
      );

      expect(result.success).toBe(true);
      expect(result.data?.supportLevel).toBe("strong");
      expect(result.data?.isGrounded).toBe(true);
    });
  });

  describe("authorization", () => {
    it("fails without team context", async () => {
      const services = createMockServices();
      const ctx = createTestContext(services, { teamId: "" });

      const result = await ragGroundTool.execute(
        {
          claim: "Some claim",
          evidence: [{ documentId: "doc_1", content: "Content" }],
          strictMode: false,
        },
        ctx
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("UNAUTHORIZED");
    });
  });

  describe("evidence collection", () => {
    it("collects supporting evidence snippets", async () => {
      const services = createMockServices({
        verifyGrounding: mock(() => ({
          isGrounded: true,
          overallScore: 0.9,
          confidence: "high" as const,
          claims: [
            {
              claim: "Claim 1",
              supported: true,
              confidence: 0.9,
              evidenceSnippet: "Supporting snippet 1",
            },
            {
              claim: "Claim 2",
              supported: true,
              confidence: 0.85,
              evidenceSnippet: "Supporting snippet 2",
            },
          ],
        })),
      });
      const ctx = createTestContext(services);

      const result = await ragGroundTool.execute(
        {
          claim: "Compound claim",
          evidence: [{ documentId: "doc_1", content: "Content" }],
          strictMode: false,
        },
        ctx
      );

      expect(result.success).toBe(true);
      expect(result.data?.supportingEvidence).toHaveLength(2);
      expect(result.data?.supportingEvidence[0]?.snippet).toBe(
        "Supporting snippet 1"
      );
    });

    it("tracks documents checked count", async () => {
      const services = createMockServices();
      const ctx = createTestContext(services);

      const result = await ragGroundTool.execute(
        {
          claim: "Some claim",
          evidence: [
            { documentId: "doc_1", content: "Content 1" },
            { documentId: "doc_2", content: "Content 2" },
            { documentId: "doc_3", content: "Content 3" },
          ],
          strictMode: false,
        },
        ctx
      );

      expect(result.success).toBe(true);
      expect(result.data?.documentsChecked).toBe(3);
    });
  });

  describe("metadata", () => {
    it("includes latency in metadata", async () => {
      const services = createMockServices();
      const ctx = createTestContext(services);

      const result = await ragGroundTool.execute(
        {
          claim: "Some claim",
          evidence: [{ documentId: "doc_1", content: "Content" }],
          strictMode: false,
        },
        ctx
      );

      expect(result.metadata?.latencyMs).toBeDefined();
      expect(result.metadata?.source).toBe("grounding-engine");
    });
  });

  describe("tool metadata", () => {
    it("has correct name and category", () => {
      expect(ragGroundTool.metadata.name).toBe("rag_ground");
      expect(ragGroundTool.metadata.category).toBe("rag");
    });
  });
});
