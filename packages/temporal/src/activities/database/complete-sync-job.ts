import type { Database } from "@openbeam/db";
import {
  completeSyncHistory,
  failSyncHistory,
  getConnectorById,
  updateConnectorSyncError,
  updateConnectorSyncSuccess,
  upsertSyncCursor,
} from "@openbeam/db";
import { publishJobProgress } from "@openbeam/redis";
import { ApplicationFailure } from "@temporalio/common";
import type { CompleteSyncJobInput } from "./types";

export interface CompleteSyncJobDeps {
  db: Database;
}

export function createCompleteSyncJobActivity(deps: CompleteSyncJobDeps) {
  const { db } = deps;

  return async function completeSyncJob(
    input: CompleteSyncJobInput
  ): Promise<void> {
    const connector = await getConnectorById(db, input.connectorId);
    if (!connector) {
      throw ApplicationFailure.nonRetryable(
        `Connector not found: ${input.connectorId}`,
        "ConnectorNotFoundError"
      );
    }

    if (input.status === "COMPLETED") {
      await completeSyncHistory(db, {
        syncHistoryId: input.syncHistoryId,
        summary: {
          totalDocuments: input.stats.indexed,
          batches: Math.ceil(input.stats.processed / 100),
          documentsFetched: input.stats.processed,
        },
        durationMs: input.stats.durationMs,
        documentsAdded: input.stats.dataAdded,
        documentsUpdated: input.stats.dataUpdated,
        documentsRemoved: input.stats.dataDeleted,
        filesDiscovered: 0,
        mediaDiscovered: 0,
      });

      await updateConnectorSyncSuccess(db, {
        connectorId: input.connectorId,
      });
    } else {
      await failSyncHistory(db, {
        syncHistoryId: input.syncHistoryId,
        errorMessage: input.errorMessage ?? "Sync failed",
      });

      await updateConnectorSyncError(db, {
        connectorId: input.connectorId,
        errorMessage: input.errorMessage ?? "Sync failed",
      });
    }

    if (input.cursor) {
      await upsertSyncCursor(db, {
        connectorId: input.connectorId,
        resource: "default",
        cursor: input.cursor,
      });
    }

    const status = input.status === "COMPLETED" ? "completed" : "failed";
    const startTime = new Date(Date.now() - input.stats.durationMs);

    await publishJobProgress(connector.teamId, {
      id: input.workflowId,
      teamId: connector.teamId,
      type: "sync",
      status,
      connectorId: input.connectorId,
      connectorName: connector.type,
      progress: status === "completed" ? 100 : 0,
      currentPhase: status === "completed" ? "COMPLETED" : "FAILED",
      itemsTotal: input.stats.processed,
      itemsProcessed: input.stats.processed,
      itemsFailed: input.stats.errors,
      startedAt: startTime.toISOString(),
      error: input.errorMessage,
    });
  };
}
