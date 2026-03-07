import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { TestWorkflowEnvironment } from "@temporalio/testing";
import { Worker } from "@temporalio/worker";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { TASK_QUEUES } from "../config/task-queues";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const workflowsPath = join(__dirname, "../workflows");

describe("Knowledge E2E integration", () => {
  let env: TestWorkflowEnvironment | undefined;
  let syncWorker: Worker | undefined;
  let knowledgeWorker: Worker | undefined;
  let setupError: unknown;

  const markedChangeIds: string[] = [];
  const recordedChanges: Record<string, unknown>[] = [];
  const fetchInputs: Record<string, unknown>[] = [];
  const countInputs: Record<string, unknown>[] = [];

  beforeAll(async () => {
    try {
      env = await TestWorkflowEnvironment.createLocal();

      syncWorker = await Worker.create({
        connection: env.nativeConnection,
        namespace: env.namespace,
        taskQueue: TASK_QUEUES.SYNC_GMAIL,
        workflowsPath,
        activities: {
          fetchBatch: async () => ({
            items: [
              {
                id: "vespa-doc-1",
                title: "Alice joins OpenBeam",
                content: "Alice and Bob collaborate on ranking systems.",
              },
            ],
            hasMore: false,
          }),

          loadConnector: async () => ({
            id: "conn-1",
            type: "gmail",
            teamId: "team-1",
            status: "ACTIVE",
            workspaceExternalId: "workspace-1",
            syncMode: "INCREMENTAL",
            lastSyncedAt: null,
            config: {},
          }),

          validateConnection: async () => ({
            valid: true,
            status: "healthy",
            canProceed: true,
          }),

          createSyncJobWithHistory: async () => ({
            syncJobId: "job-1",
            syncHistoryId: "sync-1",
          }),

          emitSyncStarted: () => Promise.resolve(),
          updateSyncProgress: () => Promise.resolve(),
          completeSyncJob: () => Promise.resolve(),
          setConnectorError: () => Promise.resolve(),
          setConnectorStatus: () => Promise.resolve(),

          upsertDiscoveredResources: async () => ({ upserted: 0 }),

          filterUnchangedDocuments: async ({
            documents,
          }: {
            documents: Record<string, unknown>[];
          }) => ({
            changedDocuments: documents,
            skipped: 0,
          }),

          deduplicateByChecksum: async ({
            documents,
          }: {
            documents: Record<string, unknown>[];
          }) => documents,

          generateEmbeddings: async ({ texts }: { texts: string[] }) => ({
            embeddings: texts.map(() => [0.1, 0.2, 0.3]),
            sparseEmbeddings: texts.map(() => ({ token: 1 })),
            model: "test",
            usage: { totalTokens: texts.length, latencyMs: 1 },
          }),

          bulkIndex: async ({
            documents,
          }: {
            documents: Array<{ id: string }>;
          }) => ({
            total: documents.length,
            indexed: documents.length,
            failed: 0,
            errors: [],
            durationMs: 1,
          }),

          trackIndexedDocuments: async ({
            documents,
          }: {
            documents: unknown[];
          }) => ({
            tracked: documents.length,
            dataAdded: documents.length,
            dataUpdated: 0,
          }),

          deleteIndexedDocuments: async ({
            externalIds,
          }: {
            externalIds: string[];
          }) => ({
            deleted: externalIds.length,
          }),

          recordSyncDocumentChanges: (input: Record<string, unknown>) => {
            recordedChanges.push(input);
            const ids = (input.documentIds as string[]) ?? [];
            return Promise.resolve({ recorded: ids.length });
          },
        },
      });

      knowledgeWorker = await Worker.create({
        connection: env.nativeConnection,
        namespace: env.namespace,
        taskQueue: TASK_QUEUES.KNOWLEDGE,
        workflowsPath,
        activities: {
          fetchUnprocessedChanges: (input: Record<string, unknown>) => {
            fetchInputs.push(input);
            return Promise.resolve([
              {
                id: "chg-1",
                teamId: "team-1",
                connectorId: "conn-1",
                documentId: "vespa-doc-1",
                changeType: "CREATED",
                processedAt: null,
                createdAt: new Date(),
                updatedAt: new Date(),
              },
            ]);
          },

          extractEntitiesFromChanges: async () => ({
            entitiesUpdated: 2,
            mentions: [
              {
                entityId: "e1",
                entityName: "Alice",
                entityType: "PERSON",
                documentId: "vespa-doc-1",
                confidence: 0.95,
              },
              {
                entityId: "e2",
                entityName: "OpenBeam",
                entityType: "PROJECT",
                documentId: "vespa-doc-1",
                confidence: 0.9,
              },
            ],
          }),

          updateCoOccurrenceEdges: async () => ({
            edgesUpdated: 1,
            edgesCreated: 1,
          }),

          markChangesProcessed: ({ changeIds }: { changeIds: string[] }) => {
            markedChangeIds.push(...changeIds);
            return Promise.resolve();
          },

          countUnprocessedChanges: (input: Record<string, unknown>) => {
            countInputs.push(input);
            return Promise.resolve(0);
          },

          invalidateEdges: async () => ({
            edgesInvalidated: 0,
            mentionsRemoved: 0,
          }),
        },
      });
    } catch (error) {
      setupError = error;
    }
  }, 300_000);

  beforeEach(() => {
    markedChangeIds.length = 0;
    recordedChanges.length = 0;
    fetchInputs.length = 0;
    countInputs.length = 0;
  });

  afterAll(async () => {
    try {
      try {
        await syncWorker?.shutdown();
        // biome-ignore lint/suspicious/noEmptyBlockStatements: best-effort teardown
      } catch {}
      try {
        await knowledgeWorker?.shutdown();
        // biome-ignore lint/suspicious/noEmptyBlockStatements: best-effort teardown
      } catch {}
    } finally {
      await env?.teardown();
    }
  });

  it("runs sync -> knowledge child workflow and marks changes processed", async () => {
    if (!(env && syncWorker && knowledgeWorker)) {
      expect(setupError).toBeDefined();
      return;
    }

    const temporalEnv = env;
    const knowledgeRun = knowledgeWorker.run();

    try {
      const result = await syncWorker.runUntil(async () => {
        const handle = await temporalEnv.client.workflow.start(
          "connectorSyncWorkflow",
          {
            taskQueue: TASK_QUEUES.SYNC_GMAIL,
            workflowId: "sync-e2e-knowledge-1",
            args: [
              {
                connectorId: "conn-1",
                syncType: "INCREMENTAL",
                trigger: "MANUAL",
              },
            ],
          }
        );

        return handle.result();
      });

      expect(result.indexed).toBe(1);
      expect(recordedChanges).toHaveLength(0);

      expect(fetchInputs[0]).toMatchObject({
        teamId: "team-1",
        connectorId: "conn-1",
        syncHistoryId: "sync-1",
      });
      expect(countInputs[0]).toMatchObject({
        teamId: "team-1",
        connectorId: "conn-1",
        syncHistoryId: "sync-1",
      });
      expect(markedChangeIds).toEqual(["chg-1"]);
    } finally {
      knowledgeWorker.shutdown();
      await knowledgeRun;
    }
  });
});
