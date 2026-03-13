import { TestWorkflowEnvironment } from "@temporalio/testing";
import type { LogEntry } from "@temporalio/worker";
import { DefaultLogger, Runtime } from "@temporalio/worker";

export async function createTestEnvironment(): Promise<{
  env: TestWorkflowEnvironment;
  teardown: () => Promise<void>;
}> {
  Runtime.install({
    logger: new DefaultLogger("WARN", (entry: LogEntry) => {
      if (process.env.DEBUG_TEMPORAL) {
        console.log(`[${entry.level}] ${entry.message}`);
      }
    }),
  });

  const env = await TestWorkflowEnvironment.createLocal();

  return {
    env,
    teardown: async () => {
      await env.teardown();
    },
  };
}

export function createMockSyncActivities() {
  return {
    fetchBatch: async (_input: {
      connector: unknown;
      cursor: unknown;
      batchSize: number;
    }) => ({
      items: [{ id: "doc1", title: "Test Doc" }],
      nextCursor: { page: 2 },
      hasMore: false,
    }),
  };
}

export function createMockDatabaseActivities() {
  return {
    loadConnector: async (connectorId: string) => ({
      id: connectorId,
      type: "gmail",
      teamId: "team_test",
    }),
    updateSyncProgress: () => Promise.resolve(),
    completeSyncJob: () => Promise.resolve(),
    setConnectorStatus: () => Promise.resolve(),
    setConnectorError: () => Promise.resolve(),
    createSyncHistory: async () => ({ id: "sync_123" }),
    updateSyncHistory: () => Promise.resolve(),
    cleanup: async () => ({ deleted: 0 }),
    removeStaleDocuments: async () => ({ deleted: 0 }),
    getTeamConnectorIds: async () => ["conn_1", "conn_2"],
    deleteConnectorRecord: async () => ({ success: true }),
    filterUnchangedDocuments: async (input: { documents: unknown[] }) => ({
      changedDocuments: input.documents,
      skipped: 0,
    }),
    trackIndexedDocuments: async (input: { documents: unknown[] }) => ({
      tracked: input.documents.length,
      dataAdded: input.documents.length,
      dataUpdated: 0,
    }),
    deleteIndexedDocuments: async (input: { externalIds: unknown[] }) => ({
      deleted: input.externalIds.length,
    }),
    recordSyncDocumentChanges: (input: { documentIds: unknown[] }) =>
      Promise.resolve({ recorded: input.documentIds.length }),
    getFileResources: async () => [],
  };
}

export function createMockVespaActivities() {
  return {
    deduplicateByChecksum: async (input: { documents: unknown[] }) =>
      input.documents,
    bulkIndex: async (input: {
      documents: unknown[];
      connectorId: string;
    }) => ({
      indexed: input.documents.length,
      failed: 0,
      errors: [] as { docId: string; error: string }[],
    }),
    search: async () => ({ results: [], total: 0 }),
    deleteDocuments: async () => ({ deleted: 0, failed: 0 }),
    deleteByConnector: async () => ({ deleted: 0 }),
    removeOrphanChunks: async () => ({ removed: 0 }),
  };
}

export function createMockEngineActivities() {
  return {
    parse: async (_input: { content: string }) => ({
      text: "parsed content",
      metadata: {},
    }),
    chunk: async (_input: { text: string }) => ({
      chunks: ["chunk1", "chunk2"],
    }),
    embed: async (input: { chunks: string[] }) => ({
      embeddings: input.chunks.map(() => [0.1, 0.2, 0.3]),
    }),
    generateEmbeddings: async (input: { texts: string[] }) => ({
      embeddings: input.texts.map(() => [0.1, 0.2, 0.3]),
      sparseEmbeddings: input.texts.map(() => ({ indices: [0], values: [1] })),
    }),
    extract: async (_input: { text: string }) => ({
      entities: [{ type: "person", value: "John" }],
    }),
    rerank: async (input: { query: string; results: unknown[] }) =>
      input.results,
  };
}

export function createMockStorageActivities() {
  return {
    download: async () => ({
      content: "file content",
      contentType: "text/plain",
    }),
    upload: async () => ({ key: "uploads/test.txt", url: "https://..." }),
    delete: async () => ({ success: true }),
    deleteByPrefix: async () => ({ deleted: 0 }),
    list: async () => ({ keys: [], truncated: false }),
    getSignedUrl: async () => ({ url: "https://signed..." }),
  };
}

export function createMockMediaActivities() {
  return {
    processMedia: async () => ({ success: true }),
    generateThumbnails: async () => ({ thumbnails: [] }),
    extractTranscript: async () => ({ transcript: "test transcript" }),
  };
}

export function createMockAgentActivities() {
  return {
    loadAgentContext: async () => ({
      agentId: "agent_123",
      config: {},
      history: [],
    }),
    executeAgentStep: async () => ({
      response: "Agent response",
      toolCalls: [],
      done: true,
    }),
    saveAgentCheckpoint: () => Promise.resolve(),
    finalizeAgentSession: () => Promise.resolve(),
  };
}

export function createMockWebhookActivities() {
  return {
    verifySignature: async () => ({ valid: true }),
    processWebhookEvent: async () => ({
      action: "none",
      processed: true,
    }),
    loadConnector: async (connectorId: string) => ({
      id: connectorId,
      type: "github",
      teamId: "team_test",
    }),
    upsertDocument: async () => ({ success: true }),
    deleteDocuments: async () => ({ deleted: 1 }),
    revokeConnector: async () => ({ success: true }),
  };
}

export function createAllMockActivities() {
  return {
    ...createMockSyncActivities(),
    ...createMockDatabaseActivities(),
    ...createMockVespaActivities(),
    ...createMockEngineActivities(),
    ...createMockStorageActivities(),
    ...createMockMediaActivities(),
    ...createMockAgentActivities(),
    ...createMockWebhookActivities(),
  };
}
