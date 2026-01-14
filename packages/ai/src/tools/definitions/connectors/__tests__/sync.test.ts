import { describe, expect, it, mock } from "bun:test";
import type {
  Connector,
  SyncJobStatus,
  ToolServices,
  TriggerSyncResult,
} from "../../../services";
import type { ToolContext } from "../../../types";
import { connectorSyncTool } from "../sync";
import { connectorSyncStatusTool } from "../sync-status";

function createMockConnector(overrides: Partial<Connector> = {}): Connector {
  return {
    id: "conn_123",
    name: "Test Slack",
    type: "slack",
    status: "active",
    lastSyncAt: new Date("2024-01-15T10:00:00Z"),
    documentCount: 1500,
    errorMessage: null,
    createdAt: new Date("2024-01-01T00:00:00Z"),
    ...overrides,
  };
}

function createMockSyncResult(
  overrides: Partial<TriggerSyncResult> = {}
): TriggerSyncResult {
  return {
    jobId: "job_456",
    connectorId: "conn_123",
    syncType: "incremental",
    queued: true,
    queuePosition: 2,
    estimatedStartTime: new Date("2024-01-15T10:05:00Z"),
    ...overrides,
  };
}

function createMockJobStatus(
  overrides: Partial<SyncJobStatus> = {}
): SyncJobStatus {
  return {
    jobId: "job_456",
    connectorId: "conn_123",
    status: "running",
    progress: {
      documentsProcessed: 500,
      documentsTotal: 1500,
      percentComplete: 33,
    },
    startedAt: new Date("2024-01-15T10:00:00Z"),
    ...overrides,
  };
}

function createMockServices(
  overrides: Partial<ToolServices["connectors"]> = {}
): ToolServices {
  const notUsed = () => {
    throw new Error("not used");
  };
  return {
    connectors: {
      list: mock(() => Promise.resolve([])),
      get: mock(() => Promise.resolve(createMockConnector())),
      getSyncHistory: mock(() => Promise.resolve([])),
      getSyncHistoryPaginated: mock(() =>
        Promise.resolve({
          entries: [],
          pagination: { total: 0, limit: 20, offset: 0, hasMore: false },
        })
      ),
      triggerSync: mock(() => Promise.resolve(createMockSyncResult())),
      getSyncJobStatus: mock(() => Promise.resolve(createMockJobStatus())),
      pause: mock(() =>
        Promise.resolve({
          connectorId: "conn_123",
          previousStatus: "active",
          newStatus: "inactive",
          message: "Paused",
        })
      ),
      resume: mock(() =>
        Promise.resolve({
          connectorId: "conn_123",
          previousStatus: "inactive",
          newStatus: "active",
          message: "Resumed",
        })
      ),
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
    rag: {
      answer: notUsed,
      synthesize: notUsed,
      analyzeQuery: notUsed,
      verifyGrounding: notUsed,
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

describe("connectorSyncTool", () => {
  describe("successful sync", () => {
    it("triggers incremental sync with default options", async () => {
      const services = createMockServices();
      const ctx = createMockContext(services);

      const result = await connectorSyncTool.execute(
        {
          connectorId: "conn_123",
          syncType: "incremental",
          priority: "normal",
        },
        ctx
      );

      expect(result.success).toBe(true);
      expect(result.data?.jobId).toBe("job_456");
      expect(result.data?.syncType).toBe("incremental");
      expect(result.data?.queued).toBe(true);
      expect(result.data?.queuePosition).toBe(2);
      expect(services.connectors.triggerSync).toHaveBeenCalledWith({
        connectorId: "conn_123",
        teamId: "team_123",
        syncType: "incremental",
        priority: "normal",
      });
    });

    it("triggers full sync when specified", async () => {
      const services = createMockServices();
      const ctx = createMockContext(services);

      const result = await connectorSyncTool.execute(
        { connectorId: "conn_123", syncType: "full", priority: "normal" },
        ctx
      );

      expect(result.success).toBe(true);
      expect(services.connectors.triggerSync).toHaveBeenCalledWith(
        expect.objectContaining({ syncType: "full" })
      );
    });

    it("respects priority parameter", async () => {
      const services = createMockServices();
      const ctx = createMockContext(services);

      await connectorSyncTool.execute(
        { connectorId: "conn_123", syncType: "incremental", priority: "high" },
        ctx
      );

      expect(services.connectors.triggerSync).toHaveBeenCalledWith(
        expect.objectContaining({ priority: "high" })
      );
    });

    it("returns connector info in response", async () => {
      const services = createMockServices({
        get: mock(() =>
          Promise.resolve(
            createMockConnector({ name: "My Slack", type: "slack" })
          )
        ),
      });
      const ctx = createMockContext(services);

      const result = await connectorSyncTool.execute(
        {
          connectorId: "conn_123",
          syncType: "incremental",
          priority: "normal",
        },
        ctx
      );

      expect(result.success).toBe(true);
      expect(result.data?.connectorName).toBe("My Slack");
      expect(result.data?.connectorType).toBe("slack");
    });

    it("handles immediately started job", async () => {
      const services = createMockServices({
        triggerSync: mock(() =>
          Promise.resolve(createMockSyncResult({ queued: false }))
        ),
      });
      const ctx = createMockContext(services);

      const result = await connectorSyncTool.execute(
        {
          connectorId: "conn_123",
          syncType: "incremental",
          priority: "normal",
        },
        ctx
      );

      expect(result.success).toBe(true);
      expect(result.data?.queued).toBe(false);
      expect(result.data?.message).toBe("Sync job started");
    });

    it("includes queue position in message", async () => {
      const services = createMockServices({
        triggerSync: mock(() =>
          Promise.resolve(
            createMockSyncResult({ queued: true, queuePosition: 5 })
          )
        ),
      });
      const ctx = createMockContext(services);

      const result = await connectorSyncTool.execute(
        {
          connectorId: "conn_123",
          syncType: "incremental",
          priority: "normal",
        },
        ctx
      );

      expect(result.data?.message).toContain("position 5");
    });
  });

  describe("authorization checks", () => {
    it("fails without team context", async () => {
      const services = createMockServices();
      const ctx = createMockContext(services, { teamId: "" });

      const result = await connectorSyncTool.execute(
        {
          connectorId: "conn_123",
          syncType: "incremental",
          priority: "normal",
        },
        ctx
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("UNAUTHORIZED");
    });
  });

  describe("connector validation", () => {
    it("fails when connector not found", async () => {
      const services = createMockServices({
        get: mock(() => Promise.resolve(null)),
      });
      const ctx = createMockContext(services);

      const result = await connectorSyncTool.execute(
        {
          connectorId: "nonexistent",
          syncType: "incremental",
          priority: "normal",
        },
        ctx
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("NOT_FOUND");
      expect(result.error?.message).toContain("nonexistent");
    });

    it("fails when connector is in error state", async () => {
      const services = createMockServices({
        get: mock(() =>
          Promise.resolve(
            createMockConnector({
              status: "error",
              errorMessage: "OAuth token expired",
            })
          )
        ),
      });
      const ctx = createMockContext(services);

      const result = await connectorSyncTool.execute(
        {
          connectorId: "conn_123",
          syncType: "incremental",
          priority: "normal",
        },
        ctx
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("INVALID_STATE");
      expect(result.error?.message).toContain("OAuth token expired");
    });

    it("fails when connector is not active", async () => {
      const services = createMockServices({
        get: mock(() =>
          Promise.resolve(createMockConnector({ status: "disconnected" }))
        ),
      });
      const ctx = createMockContext(services);

      const result = await connectorSyncTool.execute(
        {
          connectorId: "conn_123",
          syncType: "incremental",
          priority: "normal",
        },
        ctx
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("INVALID_STATE");
      expect(result.error?.message).toContain("disconnected");
    });
  });

  describe("metadata", () => {
    it("includes latency in metadata", async () => {
      const services = createMockServices();
      const ctx = createMockContext(services);

      const result = await connectorSyncTool.execute(
        {
          connectorId: "conn_123",
          syncType: "incremental",
          priority: "normal",
        },
        ctx
      );

      expect(result.metadata?.latencyMs).toBeDefined();
      expect(result.metadata?.latencyMs).toBeGreaterThanOrEqual(0);
    });

    it("includes source in metadata", async () => {
      const services = createMockServices();
      const ctx = createMockContext(services);

      const result = await connectorSyncTool.execute(
        {
          connectorId: "conn_123",
          syncType: "incremental",
          priority: "normal",
        },
        ctx
      );

      expect(result.metadata?.source).toBe("queue");
    });
  });
});

describe("connectorSyncStatusTool", () => {
  describe("successful status check", () => {
    it("returns running job status", async () => {
      const services = createMockServices();
      const ctx = createMockContext(services);

      const result = await connectorSyncStatusTool.execute(
        { jobId: "job_456" },
        ctx
      );

      expect(result.success).toBe(true);
      expect(result.data?.jobId).toBe("job_456");
      expect(result.data?.status).toBe("running");
      expect(result.data?.isComplete).toBe(false);
      expect(result.data?.isSuccess).toBe(false);
    });

    it("returns progress information", async () => {
      const services = createMockServices({
        getSyncJobStatus: mock(() =>
          Promise.resolve(
            createMockJobStatus({
              progress: {
                documentsProcessed: 750,
                documentsTotal: 1500,
                percentComplete: 50,
              },
            })
          )
        ),
      });
      const ctx = createMockContext(services);

      const result = await connectorSyncStatusTool.execute(
        { jobId: "job_456" },
        ctx
      );

      expect(result.data?.progress?.documentsProcessed).toBe(750);
      expect(result.data?.progress?.documentsTotal).toBe(1500);
      expect(result.data?.progress?.percentComplete).toBe(50);
    });

    it("marks completed job correctly", async () => {
      const services = createMockServices({
        getSyncJobStatus: mock(() =>
          Promise.resolve(
            createMockJobStatus({
              status: "completed",
              completedAt: new Date("2024-01-15T10:30:00Z"),
            })
          )
        ),
      });
      const ctx = createMockContext(services);

      const result = await connectorSyncStatusTool.execute(
        { jobId: "job_456" },
        ctx
      );

      expect(result.data?.status).toBe("completed");
      expect(result.data?.isComplete).toBe(true);
      expect(result.data?.isSuccess).toBe(true);
      expect(result.data?.completedAt).toBeDefined();
    });

    it("marks failed job correctly", async () => {
      const services = createMockServices({
        getSyncJobStatus: mock(() =>
          Promise.resolve(
            createMockJobStatus({
              status: "failed",
              errorMessage: "Rate limit exceeded",
            })
          )
        ),
      });
      const ctx = createMockContext(services);

      const result = await connectorSyncStatusTool.execute(
        { jobId: "job_456" },
        ctx
      );

      expect(result.data?.status).toBe("failed");
      expect(result.data?.isComplete).toBe(true);
      expect(result.data?.isSuccess).toBe(false);
      expect(result.data?.errorMessage).toBe("Rate limit exceeded");
    });

    it("marks cancelled job correctly", async () => {
      const services = createMockServices({
        getSyncJobStatus: mock(() =>
          Promise.resolve(createMockJobStatus({ status: "cancelled" }))
        ),
      });
      const ctx = createMockContext(services);

      const result = await connectorSyncStatusTool.execute(
        { jobId: "job_456" },
        ctx
      );

      expect(result.data?.isComplete).toBe(true);
      expect(result.data?.isSuccess).toBe(false);
    });

    it("handles job without progress info", async () => {
      const services = createMockServices({
        getSyncJobStatus: mock(() =>
          Promise.resolve(
            createMockJobStatus({ status: "queued", progress: undefined })
          )
        ),
      });
      const ctx = createMockContext(services);

      const result = await connectorSyncStatusTool.execute(
        { jobId: "job_456" },
        ctx
      );

      expect(result.data?.progress).toBeNull();
    });
  });

  describe("authorization checks", () => {
    it("fails without team context", async () => {
      const services = createMockServices();
      const ctx = createMockContext(services, { teamId: "" });

      const result = await connectorSyncStatusTool.execute(
        { jobId: "job_456" },
        ctx
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("UNAUTHORIZED");
    });
  });

  describe("job validation", () => {
    it("fails when job not found", async () => {
      const services = createMockServices({
        getSyncJobStatus: mock(() => Promise.resolve(null)),
      });
      const ctx = createMockContext(services);

      const result = await connectorSyncStatusTool.execute(
        { jobId: "nonexistent" },
        ctx
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("NOT_FOUND");
      expect(result.error?.message).toContain("nonexistent");
    });
  });

  describe("metadata", () => {
    it("includes latency in metadata", async () => {
      const services = createMockServices();
      const ctx = createMockContext(services);

      const result = await connectorSyncStatusTool.execute(
        { jobId: "job_456" },
        ctx
      );

      expect(result.metadata?.latencyMs).toBeDefined();
      expect(result.metadata?.latencyMs).toBeGreaterThanOrEqual(0);
    });

    it("includes source in metadata", async () => {
      const services = createMockServices();
      const ctx = createMockContext(services);

      const result = await connectorSyncStatusTool.execute(
        { jobId: "job_456" },
        ctx
      );

      expect(result.metadata?.source).toBe("queue");
    });
  });
});
