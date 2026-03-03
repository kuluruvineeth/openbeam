import { beforeEach, describe, expect, it, vi } from "vitest";

const mockFetchUnprocessedChanges = vi.fn();
const mockExtractEntitiesFromChanges = vi.fn();
const mockUpdateCoOccurrenceEdges = vi.fn();
const mockMarkChangesProcessed = vi.fn();
const mockCountUnprocessedChanges = vi.fn();
const mockInvalidateEdges = vi.fn();
const mockLinkPersonIdentities = vi.fn();
const mockContinueAsNew = vi.fn();
const mockExecuteChild = vi.fn();
const mockFetchBatch = vi.fn();
const mockLoadConnector = vi.fn();
const mockValidateConnection = vi.fn();
const mockCreateSyncJobWithHistory = vi.fn();
const mockEmitSyncStarted = vi.fn();
const mockUpdateSyncProgress = vi.fn();
const mockCompleteSyncJob = vi.fn();
const mockUpsertDiscoveredResources = vi.fn();
const mockSetConnectorError = vi.fn();

vi.mock("@temporalio/workflow", () => {
  const activities = {
    fetchUnprocessedChanges: mockFetchUnprocessedChanges,
    extractEntitiesFromChanges: mockExtractEntitiesFromChanges,
    updateCoOccurrenceEdges: mockUpdateCoOccurrenceEdges,
    markChangesProcessed: mockMarkChangesProcessed,
    countUnprocessedChanges: mockCountUnprocessedChanges,
    invalidateEdges: mockInvalidateEdges,
    linkPersonIdentities: mockLinkPersonIdentities,
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
      workflowId: "sync:conn-1:manual",
      startTime: new Date("2026-02-06T00:00:00Z"),
      historyLength: 0,
      unsafe: { now: () => Date.now() },
    }),
  };
});

function makeChange(
  overrides: { id?: string; documentId?: string; changeType?: string } = {}
) {
  return {
    id: overrides.id ?? "change-1",
    documentId: overrides.documentId ?? "doc-1",
    changeType: overrides.changeType ?? "CREATED",
    teamId: "team1",
    connectorId: "conn-1",
    processedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

describe("processKnowledgeChangesWorkflow", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockFetchUnprocessedChanges.mockResolvedValue([]);
    mockExtractEntitiesFromChanges.mockResolvedValue({
      entitiesUpdated: 0,
      mentions: [],
    });
    mockUpdateCoOccurrenceEdges.mockResolvedValue({
      edgesCreated: 0,
      edgesUpdated: 0,
    });
    mockMarkChangesProcessed.mockResolvedValue(undefined);
    mockCountUnprocessedChanges.mockResolvedValue(0);
    mockInvalidateEdges.mockResolvedValue({
      edgesInvalidated: 0,
      mentionsRemoved: 0,
    });
    mockLinkPersonIdentities.mockResolvedValue({ merged: 0 });
  });

  it("returns early when no unprocessed changes exist", async () => {
    const { processKnowledgeChangesWorkflow } = await import(
      "../workflows/scheduled/knowledge-changes"
    );

    const result = await processKnowledgeChangesWorkflow({
      teamId: "team1",
      connectorId: "conn-1",
      changeType: "incremental",
    });

    expect(result).toEqual({
      processed: 0,
      entitiesUpdated: 0,
      edgesUpdated: 0,
    });
    expect(mockExtractEntitiesFromChanges).not.toHaveBeenCalled();
    expect(mockMarkChangesProcessed).not.toHaveBeenCalled();
    expect(mockInvalidateEdges).not.toHaveBeenCalled();
  });

  it("scopes fetch and count calls by connector and sync history", async () => {
    const { processKnowledgeChangesWorkflow } = await import(
      "../workflows/scheduled/knowledge-changes"
    );

    mockFetchUnprocessedChanges.mockResolvedValue([
      makeChange({ id: "c1", documentId: "doc-1", changeType: "CREATED" }),
    ]);
    mockExtractEntitiesFromChanges.mockResolvedValue({
      entitiesUpdated: 1,
      mentions: [],
    });
    mockCountUnprocessedChanges.mockResolvedValue(0);

    await processKnowledgeChangesWorkflow({
      teamId: "team1",
      connectorId: "conn-1",
      syncHistoryId: "sync-123",
      changeType: "incremental",
    });

    expect(mockFetchUnprocessedChanges).toHaveBeenCalledWith({
      teamId: "team1",
      connectorId: "conn-1",
      syncHistoryId: "sync-123",
      limit: 1000,
    });
    expect(mockCountUnprocessedChanges).toHaveBeenCalledWith({
      teamId: "team1",
      connectorId: "conn-1",
      syncHistoryId: "sync-123",
    });
  });

  it("processes non-deleted changes through extraction and edge pipeline", async () => {
    const { processKnowledgeChangesWorkflow } = await import(
      "../workflows/scheduled/knowledge-changes"
    );

    mockFetchUnprocessedChanges.mockResolvedValue([
      makeChange({ id: "c1", documentId: "doc-1", changeType: "CREATED" }),
      makeChange({ id: "c2", documentId: "doc-2", changeType: "UPDATED" }),
    ]);
    mockExtractEntitiesFromChanges.mockResolvedValue({
      entitiesUpdated: 5,
      mentions: [
        {
          entityId: "e1",
          entityName: "Alice",
          entityType: "PERSON",
          documentId: "doc-1",
          confidence: 0.9,
        },
      ],
    });
    mockUpdateCoOccurrenceEdges.mockResolvedValue({
      edgesCreated: 2,
      edgesUpdated: 1,
    });
    mockCountUnprocessedChanges.mockResolvedValue(0);

    const result = await processKnowledgeChangesWorkflow({
      teamId: "team1",
      connectorId: "conn-1",
      changeType: "incremental",
    });

    expect(mockExtractEntitiesFromChanges).toHaveBeenCalledWith({
      teamId: "team1",
      documentIds: ["doc-1", "doc-2"],
    });
    expect(mockUpdateCoOccurrenceEdges).toHaveBeenCalledOnce();
    expect(mockMarkChangesProcessed).toHaveBeenCalledWith({
      changeIds: ["c1", "c2"],
    });
    expect(result).toEqual({
      processed: 2,
      entitiesUpdated: 5,
      edgesUpdated: 3,
    });
  });

  it("triggers invalidateEdges for each DELETED change", async () => {
    const { processKnowledgeChangesWorkflow } = await import(
      "../workflows/scheduled/knowledge-changes"
    );

    mockFetchUnprocessedChanges.mockResolvedValue([
      makeChange({ id: "c1", documentId: "doc-1", changeType: "DELETED" }),
      makeChange({ id: "c2", documentId: "doc-2", changeType: "DELETED" }),
      makeChange({ id: "c3", documentId: "doc-3", changeType: "CREATED" }),
    ]);
    mockExtractEntitiesFromChanges.mockResolvedValue({
      entitiesUpdated: 1,
      mentions: [],
    });
    mockCountUnprocessedChanges.mockResolvedValue(0);

    await processKnowledgeChangesWorkflow({
      teamId: "team1",
      connectorId: "conn-1",
      changeType: "incremental",
    });

    expect(mockInvalidateEdges).toHaveBeenCalledTimes(2);
    expect(mockInvalidateEdges).toHaveBeenCalledWith({
      teamId: "team1",
      documentId: "doc-1",
    });
    expect(mockInvalidateEdges).toHaveBeenCalledWith({
      teamId: "team1",
      documentId: "doc-2",
    });
  });

  it("does not call invalidateEdges when there are no DELETED changes", async () => {
    const { processKnowledgeChangesWorkflow } = await import(
      "../workflows/scheduled/knowledge-changes"
    );

    mockFetchUnprocessedChanges.mockResolvedValue([
      makeChange({ id: "c1", changeType: "CREATED" }),
    ]);
    mockExtractEntitiesFromChanges.mockResolvedValue({
      entitiesUpdated: 1,
      mentions: [],
    });
    mockCountUnprocessedChanges.mockResolvedValue(0);

    await processKnowledgeChangesWorkflow({
      teamId: "team1",
      connectorId: "conn-1",
      changeType: "incremental",
    });

    expect(mockInvalidateEdges).not.toHaveBeenCalled();
  });

  it("skips edge update when extraction produces no mentions", async () => {
    const { processKnowledgeChangesWorkflow } = await import(
      "../workflows/scheduled/knowledge-changes"
    );

    mockFetchUnprocessedChanges.mockResolvedValue([
      makeChange({ id: "c1", documentId: "doc-1" }),
    ]);
    mockExtractEntitiesFromChanges.mockResolvedValue({
      entitiesUpdated: 0,
      mentions: [],
    });
    mockCountUnprocessedChanges.mockResolvedValue(0);

    await processKnowledgeChangesWorkflow({
      teamId: "team1",
      connectorId: "conn-1",
      changeType: "incremental",
    });

    expect(mockUpdateCoOccurrenceEdges).not.toHaveBeenCalled();
  });

  it("calls continueAsNew when remaining unprocessed changes exist", async () => {
    const { processKnowledgeChangesWorkflow } = await import(
      "../workflows/scheduled/knowledge-changes"
    );

    mockFetchUnprocessedChanges.mockResolvedValue([makeChange({ id: "c1" })]);
    mockExtractEntitiesFromChanges.mockResolvedValue({
      entitiesUpdated: 1,
      mentions: [],
    });
    mockCountUnprocessedChanges.mockResolvedValue(500);

    await processKnowledgeChangesWorkflow({
      teamId: "team1",
      connectorId: "conn-1",
      syncHistoryId: "sync-abc",
      changeType: "incremental",
    });

    expect(mockContinueAsNew).toHaveBeenCalledWith(
      expect.objectContaining({
        teamId: "team1",
        connectorId: "conn-1",
        syncHistoryId: "sync-abc",
        changeType: "incremental",
        processedSoFar: 1,
      })
    );
  });

  it("accumulates processedSoFar across continueAsNew iterations", async () => {
    const { processKnowledgeChangesWorkflow } = await import(
      "../workflows/scheduled/knowledge-changes"
    );

    mockFetchUnprocessedChanges.mockResolvedValue([
      makeChange({ id: "c1" }),
      makeChange({ id: "c2" }),
    ]);
    mockExtractEntitiesFromChanges.mockResolvedValue({
      entitiesUpdated: 0,
      mentions: [],
    });
    mockCountUnprocessedChanges.mockResolvedValue(100);

    await processKnowledgeChangesWorkflow({
      teamId: "team1",
      connectorId: "conn-1",
      changeType: "incremental",
      processedSoFar: 500,
    });

    expect(mockContinueAsNew).toHaveBeenCalledWith(
      expect.objectContaining({ processedSoFar: 502 })
    );
  });

  it("returns total processed count when no remaining changes", async () => {
    const { processKnowledgeChangesWorkflow } = await import(
      "../workflows/scheduled/knowledge-changes"
    );

    mockFetchUnprocessedChanges.mockResolvedValue([
      makeChange({ id: "c1" }),
      makeChange({ id: "c2" }),
    ]);
    mockExtractEntitiesFromChanges.mockResolvedValue({
      entitiesUpdated: 3,
      mentions: [],
    });
    mockCountUnprocessedChanges.mockResolvedValue(0);

    const result = await processKnowledgeChangesWorkflow({
      teamId: "team1",
      connectorId: "conn-1",
      changeType: "incremental",
      processedSoFar: 100,
    });

    expect(result.processed).toBe(102);
    expect(result.entitiesUpdated).toBe(3);
  });

  it("validates input with Zod and rejects missing fields", async () => {
    const { processKnowledgeChangesWorkflow } = await import(
      "../workflows/scheduled/knowledge-changes"
    );

    await expect(processKnowledgeChangesWorkflow({})).rejects.toThrow();
  });

  it("validates input with Zod and rejects wrong types", async () => {
    const { processKnowledgeChangesWorkflow } = await import(
      "../workflows/scheduled/knowledge-changes"
    );

    await expect(
      processKnowledgeChangesWorkflow({ teamId: 123 })
    ).rejects.toThrow();
  });

  it("marks all changes as processed including deleted ones", async () => {
    const { processKnowledgeChangesWorkflow } = await import(
      "../workflows/scheduled/knowledge-changes"
    );

    mockFetchUnprocessedChanges.mockResolvedValue([
      makeChange({ id: "c1", changeType: "DELETED" }),
      makeChange({ id: "c2", changeType: "CREATED" }),
    ]);
    mockExtractEntitiesFromChanges.mockResolvedValue({
      entitiesUpdated: 1,
      mentions: [],
    });
    mockCountUnprocessedChanges.mockResolvedValue(0);

    await processKnowledgeChangesWorkflow({
      teamId: "team1",
      connectorId: "conn-1",
      changeType: "incremental",
    });

    expect(mockMarkChangesProcessed).toHaveBeenCalledWith({
      changeIds: ["c1", "c2"],
    });
  });

  it("does not call continueAsNew when remaining count is zero", async () => {
    const { processKnowledgeChangesWorkflow } = await import(
      "../workflows/scheduled/knowledge-changes"
    );

    mockFetchUnprocessedChanges.mockResolvedValue([makeChange({ id: "c1" })]);
    mockExtractEntitiesFromChanges.mockResolvedValue({
      entitiesUpdated: 0,
      mentions: [],
    });
    mockCountUnprocessedChanges.mockResolvedValue(0);

    const result = await processKnowledgeChangesWorkflow({
      teamId: "team1",
      connectorId: "conn-1",
      changeType: "incremental",
    });

    expect(mockContinueAsNew).not.toHaveBeenCalled();
    expect(result.processed).toBe(1);
  });

  it("calls linkPersonIdentities after edges when mentions exist", async () => {
    const { processKnowledgeChangesWorkflow } = await import(
      "../workflows/scheduled/knowledge-changes"
    );

    mockFetchUnprocessedChanges.mockResolvedValue([
      makeChange({ id: "c1", changeType: "CREATED" }),
    ]);
    mockExtractEntitiesFromChanges.mockResolvedValue({
      entitiesUpdated: 2,
      mentions: [
        {
          entityId: "e1",
          entityName: "Alice",
          entityType: "PERSON",
          documentId: "doc-1",
          confidence: 0.9,
        },
      ],
    });
    mockUpdateCoOccurrenceEdges.mockResolvedValue({
      edgesCreated: 1,
      edgesUpdated: 0,
    });
    mockCountUnprocessedChanges.mockResolvedValue(0);

    await processKnowledgeChangesWorkflow({
      teamId: "team1",
      connectorId: "conn-1",
      changeType: "incremental",
    });

    expect(mockLinkPersonIdentities).toHaveBeenCalledWith({
      teamId: "team1",
    });
  });

  it("skips linkPersonIdentities when no mentions are produced", async () => {
    const { processKnowledgeChangesWorkflow } = await import(
      "../workflows/scheduled/knowledge-changes"
    );

    mockFetchUnprocessedChanges.mockResolvedValue([
      makeChange({ id: "c1", changeType: "CREATED" }),
    ]);
    mockExtractEntitiesFromChanges.mockResolvedValue({
      entitiesUpdated: 0,
      mentions: [],
    });
    mockCountUnprocessedChanges.mockResolvedValue(0);

    await processKnowledgeChangesWorkflow({
      teamId: "team1",
      connectorId: "conn-1",
      changeType: "incremental",
    });

    expect(mockLinkPersonIdentities).not.toHaveBeenCalled();
  });
});

describe("connectorSyncWorkflow knowledge child args", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockLoadConnector.mockResolvedValue({
      id: "conn-1",
      type: "gmail",
      teamId: "team1",
      status: "ACTIVE",
      workspaceExternalId: "ws-1",
      syncMode: "INCREMENTAL",
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

    mockFetchBatch.mockResolvedValue({
      items: [{ id: "doc-1", title: "Doc 1", content: "content" }],
      hasMore: false,
    });

    mockExecuteChild
      .mockResolvedValueOnce({
        indexed: 1,
        errors: 0,
        total: 1,
        skipped: 0,
        dataAdded: 1,
        dataUpdated: 0,
        success: true,
      })
      .mockResolvedValueOnce({
        processed: 1,
        entitiesUpdated: 1,
        edgesUpdated: 1,
      });
  });

  it("starts knowledge child on knowledge queue with connector/sync/changeType args", async () => {
    const { connectorSyncWorkflow } = await import(
      "../workflows/sync/connector-sync"
    );

    await connectorSyncWorkflow({
      connectorId: "conn-1",
      syncType: "INCREMENTAL",
      trigger: "MANUAL",
    });

    expect(mockExecuteChild).toHaveBeenCalledTimes(2);
    const knowledgeChildCall = mockExecuteChild.mock.calls[1];
    const knowledgeChildOptions = knowledgeChildCall?.[1];

    expect(knowledgeChildOptions).toMatchObject({
      taskQueue: "knowledge",
      workflowId: "kg-changes:conn-1:sync-1",
      args: [
        {
          teamId: "team1",
          connectorId: "conn-1",
          syncHistoryId: "sync-1",
          changeType: "incremental",
        },
      ],
    });
  });
});
