import { describe, expect, it, mock } from "bun:test";
import type { IntegrationInfo, ToolServices } from "../../../services";
import type { ToolContext } from "../../../types";
import { integrationCapabilitiesTool } from "../capabilities";
import { integrationListAvailableTool } from "../list";

function createMockIntegration(
  overrides: Partial<IntegrationInfo> = {}
): IntegrationInfo {
  return {
    type: "slack",
    name: "Slack",
    category: "communication",
    authType: "oauth",
    capabilities: ["realtime", "search", "threads"],
    documentTypes: ["message", "channel", "file"],
    ...overrides,
  };
}

function createNotUsed(): never {
  throw new Error("not used");
}

function createMockServices(
  overrides: Partial<ToolServices["integrations"]> = {}
): ToolServices {
  return {
    integrations: {
      listAvailable: mock(() =>
        Promise.resolve([
          createMockIntegration({ type: "slack", category: "communication" }),
          createMockIntegration({
            type: "notion",
            name: "Notion",
            category: "productivity",
            documentTypes: ["page", "database"],
          }),
          createMockIntegration({
            type: "github",
            name: "GitHub",
            category: "development",
            authType: "api_key",
            documentTypes: ["issue", "pull_request", "repository"],
          }),
        ])
      ),
      getCapabilities: mock(() => Promise.resolve(createMockIntegration())),
      ...overrides,
    },
    storage: {
      list: createNotUsed,
      getSignedUrl: createNotUsed,
      exists: createNotUsed,
      getMetadata: createNotUsed,
    },
    connectors: {
      list: createNotUsed,
      get: createNotUsed,
      getSyncHistory: createNotUsed,
      getSyncHistoryPaginated: createNotUsed,
      triggerSync: createNotUsed,
      getSyncJobStatus: createNotUsed,
      pause: createNotUsed,
      resume: createNotUsed,
    },
    search: {
      hybrid: createNotUsed,
      semantic: createNotUsed,
      keyword: createNotUsed,
      unified: createNotUsed,
      export: createNotUsed,
      save: createNotUsed,
    },
    rag: {
      answer: createNotUsed,
      synthesize: createNotUsed,
      analyzeQuery: createNotUsed,
      verifyGrounding: createNotUsed,
    },
    documents: {
      get: createNotUsed,
      list: createNotUsed,
      getChunks: createNotUsed,
      export: createNotUsed,
      share: createNotUsed,
    },
    discovery: {
      getCapabilities: createNotUsed,
    },
    context: {
      storeVirtualFile: createNotUsed,
      retrieveVirtualFile: createNotUsed,
      retrieveVirtualFileChunk: createNotUsed,
      listVirtualFiles: createNotUsed,
      deleteVirtualFile: createNotUsed,
    },
    analytics: {
      getSpreadsheetSchema: createNotUsed,
      generateSql: createNotUsed,
      executeQuery: createNotUsed,
    },
    preferences: {
      get: createNotUsed,
      update: createNotUsed,
    },
    media: {
      searchByText: createNotUsed,
      searchByImage: createNotUsed,
      getTranscript: createNotUsed,
      getTranscriptWithTimestamps: createNotUsed,
      getMetadata: createNotUsed,
      analyze: createNotUsed,
      getSummary: createNotUsed,
      getChapters: createNotUsed,
      getHighlights: createNotUsed,
    },
    workspace: {
      getSchema: createNotUsed,
      generateSql: createNotUsed,
    },
  };
}

function createMockContext(
  services: ToolServices,
  overrides: Partial<ToolContext> = {}
): ToolContext {
  return {
    teamId: "team_123",
    userId: "user_456",
    services,
    ...overrides,
  };
}

describe("integrationListAvailableTool", () => {
  describe("successful listing", () => {
    it("lists all available integrations with all filter", async () => {
      const services = createMockServices();
      const ctx = createMockContext(services);

      const result = await integrationListAvailableTool.execute(
        { category: "all", authType: "all" },
        ctx
      );

      expect(result.success).toBe(true);
      expect(result.data?.totalCount).toBe(3);
      expect(result.data?.integrations).toHaveLength(3);
    });

    it("returns integration details", async () => {
      const services = createMockServices();
      const ctx = createMockContext(services);

      const result = await integrationListAvailableTool.execute(
        { category: "all", authType: "all" },
        ctx
      );

      const slack = result.data?.integrations.find((i) => i.type === "slack");
      expect(slack?.name).toBe("Slack");
      expect(slack?.category).toBe("communication");
      expect(slack?.authType).toBe("oauth");
      expect(slack?.documentTypes).toContain("message");
    });

    it("groups integrations by category", async () => {
      const services = createMockServices();
      const ctx = createMockContext(services);

      const result = await integrationListAvailableTool.execute(
        { category: "all", authType: "all" },
        ctx
      );

      expect(result.data?.byCategory).toHaveProperty("communication");
      expect(result.data?.byCategory).toHaveProperty("productivity");
      expect(result.data?.byCategory).toHaveProperty("development");
    });

    it("filters by category", async () => {
      const services = createMockServices();
      const ctx = createMockContext(services);

      const result = await integrationListAvailableTool.execute(
        { category: "communication", authType: "all" },
        ctx
      );

      expect(result.success).toBe(true);
      expect(result.data?.totalCount).toBe(1);
      expect(result.data?.integrations[0]?.type).toBe("slack");
    });

    it("filters by auth type", async () => {
      const services = createMockServices();
      const ctx = createMockContext(services);

      const result = await integrationListAvailableTool.execute(
        { category: "all", authType: "api_key" },
        ctx
      );

      expect(result.success).toBe(true);
      expect(result.data?.totalCount).toBe(1);
      expect(result.data?.integrations[0]?.type).toBe("github");
    });

    it("combines category and auth type filters", async () => {
      const services = createMockServices();
      const ctx = createMockContext(services);

      const result = await integrationListAvailableTool.execute(
        { category: "development", authType: "api_key" },
        ctx
      );

      expect(result.success).toBe(true);
      expect(result.data?.totalCount).toBe(1);
    });

    it("returns empty when no matches", async () => {
      const services = createMockServices();
      const ctx = createMockContext(services);

      const result = await integrationListAvailableTool.execute(
        { category: "crm", authType: "all" },
        ctx
      );

      expect(result.success).toBe(true);
      expect(result.data?.totalCount).toBe(0);
      expect(result.data?.integrations).toHaveLength(0);
    });

    it("includes latency metadata", async () => {
      const services = createMockServices();
      const ctx = createMockContext(services);

      const result = await integrationListAvailableTool.execute(
        { category: "all", authType: "all" },
        ctx
      );

      expect(result.metadata?.latencyMs).toBeDefined();
      expect(result.metadata?.source).toBe("integrations");
    });
  });

  describe("authorization checks", () => {
    it("fails without team context", async () => {
      const services = createMockServices();
      const ctx = createMockContext(services, { teamId: "" });

      const result = await integrationListAvailableTool.execute(
        { category: "all", authType: "all" },
        ctx
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("UNAUTHORIZED");
    });
  });
});

describe("integrationCapabilitiesTool", () => {
  describe("successful capability retrieval", () => {
    it("returns detailed capabilities for integration", async () => {
      const services = createMockServices();
      const ctx = createMockContext(services);

      const result = await integrationCapabilitiesTool.execute(
        { integrationType: "slack" },
        ctx
      );

      expect(result.success).toBe(true);
      expect(result.data?.type).toBe("slack");
      expect(result.data?.name).toBe("Slack");
      expect(result.data?.capabilities).toContain("realtime");
    });

    it("includes auth description for oauth", async () => {
      const services = createMockServices();
      const ctx = createMockContext(services);

      const result = await integrationCapabilitiesTool.execute(
        { integrationType: "slack" },
        ctx
      );

      expect(result.data?.authDescription).toContain("OAuth 2.0");
    });

    it("includes auth description for api_key", async () => {
      const services = createMockServices({
        getCapabilities: mock(() =>
          Promise.resolve(
            createMockIntegration({ type: "github", authType: "api_key" })
          )
        ),
      });
      const ctx = createMockContext(services);

      const result = await integrationCapabilitiesTool.execute(
        { integrationType: "github" },
        ctx
      );

      expect(result.data?.authDescription).toContain("API key");
    });

    it("includes auth description for service_account", async () => {
      const services = createMockServices({
        getCapabilities: mock(() =>
          Promise.resolve(
            createMockIntegration({
              type: "google_drive",
              authType: "service_account",
            })
          )
        ),
      });
      const ctx = createMockContext(services);

      const result = await integrationCapabilitiesTool.execute(
        { integrationType: "google_drive" },
        ctx
      );

      expect(result.data?.authDescription).toContain("service account");
    });

    it("formats document types description for single type", async () => {
      const services = createMockServices({
        getCapabilities: mock(() =>
          Promise.resolve(createMockIntegration({ documentTypes: ["message"] }))
        ),
      });
      const ctx = createMockContext(services);

      const result = await integrationCapabilitiesTool.execute(
        { integrationType: "slack" },
        ctx
      );

      expect(result.data?.documentTypesDescription).toBe(
        "Provides message documents"
      );
    });

    it("formats document types description for two types", async () => {
      const services = createMockServices({
        getCapabilities: mock(() =>
          Promise.resolve(
            createMockIntegration({ documentTypes: ["message", "channel"] })
          )
        ),
      });
      const ctx = createMockContext(services);

      const result = await integrationCapabilitiesTool.execute(
        { integrationType: "slack" },
        ctx
      );

      expect(result.data?.documentTypesDescription).toBe(
        "Provides message and channel documents"
      );
    });

    it("formats document types description for multiple types", async () => {
      const services = createMockServices({
        getCapabilities: mock(() =>
          Promise.resolve(
            createMockIntegration({
              documentTypes: ["message", "channel", "file"],
            })
          )
        ),
      });
      const ctx = createMockContext(services);

      const result = await integrationCapabilitiesTool.execute(
        { integrationType: "slack" },
        ctx
      );

      expect(result.data?.documentTypesDescription).toBe(
        "Provides message, channel, and file documents"
      );
    });

    it("handles empty document types", async () => {
      const services = createMockServices({
        getCapabilities: mock(() =>
          Promise.resolve(createMockIntegration({ documentTypes: [] }))
        ),
      });
      const ctx = createMockContext(services);

      const result = await integrationCapabilitiesTool.execute(
        { integrationType: "slack" },
        ctx
      );

      expect(result.data?.documentTypesDescription).toBe(
        "No document types specified"
      );
    });

    it("includes latency metadata", async () => {
      const services = createMockServices();
      const ctx = createMockContext(services);

      const result = await integrationCapabilitiesTool.execute(
        { integrationType: "slack" },
        ctx
      );

      expect(result.metadata?.latencyMs).toBeDefined();
      expect(result.metadata?.source).toBe("integrations");
    });
  });

  describe("integration not found", () => {
    it("fails when integration type not found", async () => {
      const services = createMockServices({
        getCapabilities: mock(() => Promise.resolve(null)),
      });
      const ctx = createMockContext(services);

      const result = await integrationCapabilitiesTool.execute(
        { integrationType: "unknown_integration" },
        ctx
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("NOT_FOUND");
      expect(result.error?.message).toContain("unknown_integration");
    });
  });

  describe("authorization checks", () => {
    it("fails without team context", async () => {
      const services = createMockServices();
      const ctx = createMockContext(services, { teamId: "" });

      const result = await integrationCapabilitiesTool.execute(
        { integrationType: "slack" },
        ctx
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("UNAUTHORIZED");
    });
  });
});
