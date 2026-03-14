import { beforeEach, describe, expect, it, vi } from "vitest";

const mockFetchBatch = vi.fn();
const mockLoadConnector = vi.fn();
const mockValidateConnection = vi.fn();
const mockCreateSyncJobWithHistory = vi.fn();
const mockEmitSyncStarted = vi.fn();
const mockUpdateSyncProgress = vi.fn();
const mockCompleteSyncJob = vi.fn();
const mockUpsertDiscoveredResources = vi.fn();
const mockSetConnectorError = vi.fn();
const mockContinueAsNew = vi.fn();
const mockExecuteChild = vi.fn();

vi.mock("@temporalio/workflow", () => {
  const activities = {
    fetchBatch: mockFetchBatch,
    loadConnector: mockLoadConnector,
    validateConnection: mockValidateConnection,
    createSyncJobWithHistory: mockCreateSyncJobWithHistory,
    emitSyncStarted: mockEmitSyncStarted,
    updateSyncProgress: mockUpdateSyncProgress,
    completeSyncJob: mockCompleteSyncJob,
    upsertDiscoveredResources: mockUpsertDiscoveredResources,
    setConnectorError: mockSetConnectorError,
  };

  return {
    proxyActivities: () => activities,
    continueAsNew: mockContinueAsNew,
    executeChild: mockExecuteChild,
    defineQuery: vi.fn((name: string) => name),
    defineSignal: vi.fn((name: string) => name),
    condition: vi.fn().mockResolvedValue(true),
    setHandler: vi.fn(),
    workflowInfo: () => ({
      workflowId: "sync:conn-slack-test:manual",
      startTime: new Date("2026-03-14T00:00:00Z"),
      historyLength: 0,
      unsafe: { now: () => Date.now() },
    }),
  };
});

function makeDoc(id: string) {
  return { id, title: `Doc ${id}`, content: `Content for ${id}` };
}

describe("connectorSyncWorkflow Slack multi-stage simulation", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockLoadConnector.mockResolvedValue({
      id: "conn-slack-test",
      type: "SLACK",
      teamId: "team-1",
      status: "ACTIVE",
      workspaceExternalId: "ws-1",
      syncMode: "FULL",
      lastSyncedAt: null,
      config: {},
    });
    mockValidateConnection.mockResolvedValue({
      valid: true,
      status: "healthy",
      canProceed: true,
    });
    mockCreateSyncJobWithHistory.mockResolvedValue({
      syncJobId: "job-1",
      syncHistoryId: "sync-1",
    });
    mockEmitSyncStarted.mockResolvedValue(undefined);
    mockUpdateSyncProgress.mockResolvedValue(undefined);
    mockCompleteSyncJob.mockResolvedValue(undefined);
    mockUpsertDiscoveredResources.mockResolvedValue({ upserted: 0 });
    mockSetConnectorError.mockResolvedValue(undefined);
  });

  it("processes messages, discovers files, runs processDiscoveredFilesWorkflow, and terminates cleanly", async () => {
    let fetchBatchCallCount = 0;

    mockFetchBatch.mockImplementation(() => {
      fetchBatchCallCount += 1;

      switch (fetchBatchCallCount) {
        case 1:
          return Promise.resolve({
            items: Array.from({ length: 61 }, (_, i) => makeDoc(`ch1-${i}`)),
            hasMore: true,
            nextCursor: { channelCursors: { C1: "ts1" } },
            discoveredResources: [
              {
                connectorId: "conn-slack-test",
                externalId: "C1",
                resourceType: "channel",
                name: "general",
                isPublic: true,
                metadata: {},
              },
            ],
          });

        case 2:
          return Promise.resolve({
            items: Array.from({ length: 29 }, (_, i) => makeDoc(`ch2-${i}`)),
            hasMore: true,
            nextCursor: { channelCursors: { C1: "ts1", C2: "ts2" } },
          });

        case 3:
          return Promise.resolve({
            items: Array.from({ length: 32 }, (_, i) => makeDoc(`ch3-${i}`)),
            hasMore: true,
            nextCursor: {
              channelCursors: { C1: "ts1", C2: "ts2", C3: "ts3" },
            },
          });

        case 4:
          return Promise.resolve({
            items: [],
            hasMore: true,
            nextCursor: { lastFileSyncTimestamp: "100" },
            discoveredResources: [
              {
                connectorId: "conn-slack-test",
                externalId: "F001",
                resourceType: "file",
                name: "report.pdf",
                metadata: { mimeType: "application/pdf", size: 1024 },
              },
              {
                connectorId: "conn-slack-test",
                externalId: "F002",
                resourceType: "video",
                name: "demo.mp4",
                metadata: { mimeType: "video/mp4", size: 50_000 },
              },
            ],
          });

        case 5:
          return Promise.resolve({
            items: [],
            hasMore: true,
            nextCursor: { lastFileSyncTimestamp: "200" },
            discoveredResources: [
              {
                connectorId: "conn-slack-test",
                externalId: "F003",
                resourceType: "audio",
                name: "standup.webm",
                metadata: { mimeType: "audio/webm", size: 8000 },
              },
            ],
          });

        case 6:
          return Promise.resolve({
            items: [makeDoc("canvas-1"), makeDoc("canvas-2")],
            hasMore: true,
          });

        case 7:
          return Promise.resolve({
            items: [makeDoc("bookmark-1")],
            hasMore: true,
          });

        case 8:
          return Promise.resolve({
            items: [],
            hasMore: false,
          });

        default:
          throw new Error(
            `fetchBatch called too many times: ${fetchBatchCallCount}`
          );
      }
    });

    mockExecuteChild.mockImplementation(
      (_workflowFn: unknown, options: { workflowId: string }) => {
        if (options.workflowId.startsWith("index:")) {
          return Promise.resolve({
            indexed: 1,
            errors: 0,
            total: 1,
            skipped: 0,
            dataAdded: 1,
            dataUpdated: 0,
            success: true,
          });
        }
        if (options.workflowId.includes("discovered")) {
          return Promise.resolve({
            filesProcessed: 3,
            mediaProcessed: 1,
            errors: 0,
          });
        }
        if (options.workflowId.startsWith("kg-changes:")) {
          return Promise.resolve({
            processed: 5,
            entitiesUpdated: 2,
            edgesUpdated: 1,
          });
        }
        return Promise.resolve({});
      }
    );

    const { connectorSyncWorkflow } = await import(
      "../workflows/sync/connector-sync"
    );

    const result = await connectorSyncWorkflow({
      connectorId: "conn-slack-test",
      syncType: "FULL",
      trigger: "MANUAL",
    });

    expect(fetchBatchCallCount).toBe(8);

    expect(result.processed).toBe(61 + 29 + 32 + 2 + 1);
    expect(result.errors).toBe(0);

    const upsertCalls = mockUpsertDiscoveredResources.mock.calls;
    expect(upsertCalls.length).toBe(3);

    const allDiscoveredResources = upsertCalls.flatMap(
      (
        call: Array<{
          resources: Array<{ externalId: string; resourceType: string }>;
        }>
      ) => call[0]?.resources ?? []
    );
    const fileResources = allDiscoveredResources.filter(
      (r) =>
        r.resourceType === "file" ||
        r.resourceType === "video" ||
        r.resourceType === "audio"
    );
    expect(fileResources).toHaveLength(3);

    const fileIds = fileResources.map(
      (r: { externalId: string }) => r.externalId
    );
    expect(fileIds).toContain("F001");
    expect(fileIds).toContain("F002");
    expect(fileIds).toContain("F003");

    const executeChildCalls = mockExecuteChild.mock.calls;

    const indexCalls = executeChildCalls.filter(
      (call: Array<{ workflowId: string }>) =>
        call[1]?.workflowId?.startsWith("index:")
    );
    expect(indexCalls).toHaveLength(5);

    const fileProcessingCall = executeChildCalls.find(
      (call: Array<{ workflowId: string }>) =>
        call[1]?.workflowId?.includes("discovered")
    );
    expect(fileProcessingCall).toBeDefined();

    const knowledgeCall = executeChildCalls.find(
      (call: Array<{ workflowId: string }>) =>
        call[1]?.workflowId?.startsWith("kg-changes:")
    );
    expect(knowledgeCall).toBeDefined();

    const completeSyncCall = mockCompleteSyncJob.mock.calls[0]?.[0] as {
      status: string;
      stats: { processed: number };
    };
    expect(completeSyncCall.status).toBe("COMPLETED");
    expect(completeSyncCall.stats.processed).toBe(125);
  });

  it("does NOT loop infinitely when all batches have hasMore:true except the final done signal", async () => {
    let callCount = 0;
    const MAX_SAFE_CALLS = 100;

    mockFetchBatch.mockImplementation(() => {
      callCount += 1;
      if (callCount > MAX_SAFE_CALLS) {
        throw new Error(
          `INFINITE LOOP DETECTED: fetchBatch called ${callCount} times`
        );
      }

      if (callCount <= 3) {
        return Promise.resolve({
          items: [makeDoc(`item-${callCount}`)],
          hasMore: true,
        });
      }

      return Promise.resolve({
        items: [],
        hasMore: false,
      });
    });

    mockExecuteChild.mockResolvedValue({
      indexed: 1,
      errors: 0,
      total: 1,
      skipped: 0,
      dataAdded: 1,
      dataUpdated: 0,
      success: true,
      filesProcessed: 0,
      mediaProcessed: 0,
      processed: 0,
      entitiesUpdated: 0,
      edgesUpdated: 0,
    });

    const { connectorSyncWorkflow } = await import(
      "../workflows/sync/connector-sync"
    );

    const result = await connectorSyncWorkflow({
      connectorId: "conn-slack-test",
      syncType: "FULL",
      trigger: "MANUAL",
    });

    expect(callCount).toBe(4);
    expect(result.processed).toBe(3);
  });

  it("handles file-only discovery batches (items=[], discoveredResources) without breaking the loop", async () => {
    let callCount = 0;

    mockFetchBatch.mockImplementation(() => {
      callCount += 1;

      switch (callCount) {
        case 1:
          return Promise.resolve({
            items: [makeDoc("msg-1")],
            hasMore: true,
          });
        case 2:
          return Promise.resolve({
            items: [],
            hasMore: true,
            discoveredResources: [
              {
                connectorId: "conn-slack-test",
                externalId: "F1",
                resourceType: "file",
                name: "file.pdf",
                metadata: {},
              },
            ],
          });
        case 3:
          return Promise.resolve({
            items: [],
            hasMore: true,
            discoveredResources: [
              {
                connectorId: "conn-slack-test",
                externalId: "F2",
                resourceType: "video",
                name: "vid.mp4",
                metadata: {},
              },
            ],
          });
        case 4:
          return Promise.resolve({
            items: [makeDoc("canvas-1")],
            hasMore: true,
          });
        case 5:
          return Promise.resolve({
            items: [],
            hasMore: false,
          });
        default:
          throw new Error(`INFINITE LOOP: call ${callCount}`);
      }
    });

    mockExecuteChild.mockResolvedValue({
      indexed: 1,
      errors: 0,
      total: 1,
      skipped: 0,
      dataAdded: 1,
      dataUpdated: 0,
      success: true,
      filesProcessed: 0,
      mediaProcessed: 0,
      processed: 0,
      entitiesUpdated: 0,
      edgesUpdated: 0,
    });

    const { connectorSyncWorkflow } = await import(
      "../workflows/sync/connector-sync"
    );

    const result = await connectorSyncWorkflow({
      connectorId: "conn-slack-test",
      syncType: "FULL",
      trigger: "MANUAL",
    });

    expect(callCount).toBe(5);
    expect(result.processed).toBe(2);

    expect(mockUpsertDiscoveredResources).toHaveBeenCalledTimes(2);

    const allResources = mockUpsertDiscoveredResources.mock.calls.flatMap(
      (call: Array<{ resources: Array<{ externalId: string }> }>) =>
        call[0]?.resources ?? []
    );
    expect(allResources).toHaveLength(2);
    expect(allResources[0]?.externalId).toBe("F1");
    expect(allResources[1]?.externalId).toBe("F2");

    const fileProcessingCalled = mockExecuteChild.mock.calls.some(
      (call: Array<{ workflowId: string }>) =>
        call[1]?.workflowId?.includes("discovered")
    );
    expect(fileProcessingCalled).toBe(true);
  });

  it("BUG REGRESSION: inner hasMore=false on message batch does NOT kill file discovery", async () => {
    let callCount = 0;

    mockFetchBatch.mockImplementation(() => {
      callCount += 1;

      switch (callCount) {
        case 1:
          return Promise.resolve({
            items: Array.from({ length: 61 }, (_, i) => makeDoc(`msg-${i}`)),
            hasMore: true,
          });
        case 2:
          return Promise.resolve({
            items: Array.from({ length: 29 }, (_, i) => makeDoc(`msg2-${i}`)),
            hasMore: true,
          });
        case 3:
          return Promise.resolve({
            items: [],
            hasMore: true,
            discoveredResources: [
              {
                connectorId: "conn-slack-test",
                externalId: "F1",
                resourceType: "file",
                name: "doc.pdf",
                metadata: {},
              },
            ],
          });
        case 4:
          return Promise.resolve({
            items: [],
            hasMore: false,
          });
        default:
          throw new Error(`INFINITE LOOP: call ${callCount}`);
      }
    });

    mockExecuteChild.mockResolvedValue({
      indexed: 1,
      errors: 0,
      total: 1,
      skipped: 0,
      dataAdded: 1,
      dataUpdated: 0,
      success: true,
      filesProcessed: 0,
      mediaProcessed: 0,
      processed: 0,
      entitiesUpdated: 0,
      edgesUpdated: 0,
    });

    const { connectorSyncWorkflow } = await import(
      "../workflows/sync/connector-sync"
    );

    const result = await connectorSyncWorkflow({
      connectorId: "conn-slack-test",
      syncType: "FULL",
      trigger: "MANUAL",
    });

    expect(callCount).toBe(4);
    expect(result.processed).toBe(90);

    expect(mockUpsertDiscoveredResources).toHaveBeenCalledTimes(1);
    const discoveredFiles = (
      mockUpsertDiscoveredResources.mock.calls[0]?.[0] as {
        resources: Array<{ externalId: string }>;
      }
    )?.resources;
    expect(discoveredFiles).toHaveLength(1);
    expect(discoveredFiles?.[0]?.externalId).toBe("F1");

    const fileProcessingCalled = mockExecuteChild.mock.calls.some(
      (call: Array<{ workflowId: string }>) =>
        call[1]?.workflowId?.includes("discovered")
    );
    expect(fileProcessingCalled).toBe(true);

    expect(mockCompleteSyncJob).toHaveBeenCalledWith(
      expect.objectContaining({ status: "COMPLETED" })
    );
  });
});
