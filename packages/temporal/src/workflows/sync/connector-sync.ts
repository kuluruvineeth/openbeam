import {
  ConnectorSyncInputSchema,
  type ConnectorSyncOutput,
} from "@openplane/types/temporal/workflows";
import {
  condition,
  continueAsNew,
  executeChild,
  proxyActivities,
  setHandler,
  workflowInfo,
} from "@temporalio/workflow";
import type { ConnectorSyncActivities } from "../../activities/connectors/types";
import type {
  DatabaseActivities,
  SyncStage,
} from "../../activities/database/types";
import { TASK_QUEUES } from "../../config";
import { generateWorkflowId } from "../../utils/workflow-id";
import { indexDocumentsWorkflow } from "../processing/index-documents";
import { processKnowledgeChangesWorkflow } from "../scheduled/knowledge-changes";
import {
  cancelSignal,
  pauseSignal,
  progressQuery,
  resumeSignal,
  type SyncState,
} from "../types";

const connectorFetchActivities = proxyActivities<ConnectorSyncActivities>({
  startToCloseTimeout: "15m",
  scheduleToCloseTimeout: "45m",
  heartbeatTimeout: "60s",
  retry: {
    initialInterval: "2s",
    backoffCoefficient: 2,
    maximumAttempts: 3,
    nonRetryableErrorTypes: ["AuthorizationError", "ConnectorNotFoundError"],
  },
});

const syncProgressActivities = proxyActivities<DatabaseActivities>({
  startToCloseTimeout: "30s",
  scheduleToCloseTimeout: "3m",
  heartbeatTimeout: "10s",
  retry: { maximumAttempts: 5 },
});

export async function connectorSyncWorkflow(
  rawInput: unknown
): Promise<ConnectorSyncOutput> {
  const input = ConnectorSyncInputSchema.parse(rawInput);

  const prior = input.accumulatedStats;
  const state: SyncState = {
    processed: prior?.processed ?? 0,
    indexed: prior?.indexed ?? 0,
    errors: prior?.errors ?? 0,
    dataAdded: prior?.dataAdded ?? 0,
    dataUpdated: prior?.dataUpdated ?? 0,
    dataDeleted: prior?.dataDeleted ?? 0,
    cursor: input.cursor,
    stage: "INITIALIZING",
    batchNumber: 0,
    isPaused: false,
  };

  let estimatedTotal = 0;

  setHandler(progressQuery, () => state);
  setHandler(cancelSignal, () => {
    state.cancelled = true;
  });
  setHandler(pauseSignal, () => {
    state.isPaused = true;
  });
  setHandler(resumeSignal, () => {
    state.isPaused = false;
  });

  const connector = await syncProgressActivities.loadConnector(
    input.connectorId
  );
  const startTime = workflowInfo().startTime.getTime();

  const connectionValidation = await syncProgressActivities.validateConnection({
    connectorId: input.connectorId,
    teamId: connector.teamId,
    failOnDegraded: false,
  });

  if (!connectionValidation.canProceed) {
    await syncProgressActivities.setConnectorError({
      connectorId: input.connectorId,
      error: connectionValidation.message ?? "Connection validation failed",
    });
    throw new Error(
      `Connection validation failed: ${connectionValidation.message ?? connectionValidation.status}`
    );
  }

  const triggerMap = {
    SCHEDULE: "SCHEDULED",
    MANUAL: "MANUAL",
    WEBHOOK: "WEBHOOK",
  } as const;

  const syncHistoryId = input.syncHistoryId
    ? input.syncHistoryId
    : (
        await syncProgressActivities.createSyncJobWithHistory({
          connectorId: input.connectorId,
          syncType: input.syncType,
          trigger: triggerMap[input.trigger],
        })
      ).syncHistoryId;

  const workflowId = workflowInfo().workflowId;

  await syncProgressActivities.emitSyncStarted({
    workflowId,
    syncHistoryId,
    connectorId: input.connectorId,
    teamId: connector.teamId,
    connectorName: connector.type,
  });

  try {
    while (!state.cancelled) {
      await condition(() => !state.isPaused || !!state.cancelled);
      if (state.cancelled) {
        break;
      }

      state.stage = "FETCHING";
      state.progressMessage = `Batch ${(state.batchNumber ?? 0) + 1}: Fetching items (${state.processed}/${estimatedTotal} processed so far)`;
      await syncProgressActivities.updateSyncProgress({
        workflowId,
        connectorId: input.connectorId,
        syncHistoryId,
        teamId: connector.teamId,
        connectorName: connector.type,
        processed: state.processed,
        indexed: state.indexed,
        errors: state.errors,
        total: estimatedTotal,
        stage: "FETCHING" as SyncStage,
        cursor: state.cursor ? JSON.stringify(state.cursor) : undefined,
        progressMessage: state.progressMessage,
      });

      state.batchNumber = (state.batchNumber ?? 0) + 1;

      const batch = await connectorFetchActivities.fetchBatch({
        connector,
        cursor: state.cursor,
        batchSize: 100,
      });

      if (batch.progressMessage) {
        state.progressMessage = `Batch ${state.batchNumber}: ${batch.progressMessage}`;
      } else {
        state.progressMessage = `Processing batch ${state.batchNumber}`;
      }

      if (batch.discoveredResources && batch.discoveredResources.length > 0) {
        await syncProgressActivities.upsertDiscoveredResources({
          resources: batch.discoveredResources.map((r) => ({
            connectorId: input.connectorId,
            externalId: r.externalId,
            resourceType: r.resourceType,
            name: r.name,
            path: r.path,
            parentId: r.parentId,
            isPublic: r.isPublic,
            metadata: r.metadata,
          })),
        });
      }

      if (batch.items.length === 0) {
        break;
      }

      if (batch.hasMore) {
        estimatedTotal = Math.max(
          estimatedTotal,
          state.processed + batch.items.length * 2
        );
      } else {
        estimatedTotal = state.processed + batch.items.length;
      }

      state.stage = "TRANSFORMING";
      state.progressMessage = `Batch ${state.batchNumber}: Transforming ${batch.items.length} items (${state.processed}/${estimatedTotal} total processed)`;
      await syncProgressActivities.updateSyncProgress({
        workflowId,
        connectorId: input.connectorId,
        syncHistoryId,
        teamId: connector.teamId,
        connectorName: connector.type,
        processed: state.processed,
        indexed: state.indexed,
        errors: state.errors,
        total: estimatedTotal,
        stage: "TRANSFORMING" as SyncStage,
        cursor: state.cursor ? JSON.stringify(state.cursor) : undefined,
        progressMessage: state.progressMessage,
      });

      const indexResult = await executeChild(indexDocumentsWorkflow, {
        args: [
          {
            documents: batch.items,
            connectorId: input.connectorId,
            syncHistoryId,
          },
        ],
        workflowId: generateWorkflowId({
          type: "index",
          connectorId: input.connectorId,
          timestamp: state.batchNumber,
        }),
      });

      state.processed += batch.items.length;
      state.indexed += indexResult.indexed;
      state.errors += indexResult.errors;
      state.dataAdded += indexResult.dataAdded ?? 0;
      state.dataUpdated += indexResult.dataUpdated ?? 0;
      state.cursor = batch.nextCursor;

      state.stage = "INDEXING";
      state.progressMessage = `Batch ${state.batchNumber}: Indexed ${indexResult.indexed} items (${state.indexed}/${state.processed} total indexed, ${state.errors} errors)`;
      await syncProgressActivities.updateSyncProgress({
        workflowId,
        connectorId: input.connectorId,
        syncHistoryId,
        teamId: connector.teamId,
        connectorName: connector.type,
        processed: state.processed,
        indexed: state.indexed,
        errors: state.errors,
        total: estimatedTotal,
        stage: "INDEXING" as SyncStage,
        cursor: state.cursor ? JSON.stringify(state.cursor) : undefined,
        progressMessage: state.progressMessage,
      });

      if (!batch.hasMore) {
        break;
      }

      if (workflowInfo().historyLength > 10_000) {
        return continueAsNew<typeof connectorSyncWorkflow>({
          ...input,
          syncHistoryId,
          cursor: state.cursor,
          accumulatedStats: {
            processed: state.processed,
            indexed: state.indexed,
            errors: state.errors,
            dataAdded: state.dataAdded,
            dataUpdated: state.dataUpdated,
            dataDeleted: state.dataDeleted,
          },
        });
      }
    }

    const changeTypeMap = {
      FULL: "full",
      INCREMENTAL: "incremental",
      PERMISSIONS: "incremental",
    } as const;

    await executeChild(processKnowledgeChangesWorkflow, {
      taskQueue: TASK_QUEUES.KNOWLEDGE,
      workflowId: `kg-changes:${input.connectorId}:${syncHistoryId}`,
      args: [
        {
          teamId: connector.teamId,
          connectorId: input.connectorId,
          syncHistoryId,
          changeType: changeTypeMap[input.syncType],
        },
      ],
    });

    state.stage = "FINALIZING";
    const endTime = workflowInfo().unsafe.now();
    await syncProgressActivities.completeSyncJob({
      workflowId,
      connectorId: input.connectorId,
      syncHistoryId,
      status: state.cancelled ? "CANCELLED" : "COMPLETED",
      stats: {
        processed: state.processed,
        indexed: state.indexed,
        errors: state.errors,
        dataAdded: state.dataAdded,
        dataUpdated: state.dataUpdated,
        dataDeleted: state.dataDeleted,
        durationMs: endTime - startTime,
      },
      cursor: state.cursor ? JSON.stringify(state.cursor) : undefined,
    });

    return {
      processed: state.processed,
      indexed: state.indexed,
      errors: state.errors,
      finalCursor: state.cursor ?? {},
      duration: endTime - startTime,
    };
  } catch (error) {
    state.stage = "FAILED";
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error during sync";
    const endTime = workflowInfo().unsafe.now();

    await syncProgressActivities.completeSyncJob({
      workflowId,
      connectorId: input.connectorId,
      syncHistoryId,
      status: "FAILED",
      errorMessage,
      stats: {
        processed: state.processed,
        indexed: state.indexed,
        errors: state.errors + 1,
        dataAdded: state.dataAdded,
        dataUpdated: state.dataUpdated,
        dataDeleted: state.dataDeleted,
        durationMs: endTime - startTime,
      },
      cursor: state.cursor ? JSON.stringify(state.cursor) : undefined,
    });

    throw error;
  }
}
