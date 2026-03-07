import type { Database } from "@openbeam/db";
import { updateSyncProgress, upsertSyncCursor } from "@openbeam/db";
import { type JobStatus, publishJobProgress } from "@openbeam/redis";
import type { SyncStage, UpdateSyncProgressInput } from "./types";

export interface UpdateSyncProgressDeps {
  db: Database;
}

function mapStageToStatus(stage: SyncStage): JobStatus {
  switch (stage) {
    case "COMPLETED":
      return "completed";
    case "FAILED":
      return "failed";
    default:
      return "running";
  }
}

export function createUpdateSyncProgressActivity(deps: UpdateSyncProgressDeps) {
  const { db } = deps;

  return async function updateSyncProgressActivity(
    input: UpdateSyncProgressInput
  ): Promise<void> {
    await updateSyncProgress(db, {
      syncHistoryId: input.syncHistoryId,
      stage: input.stage,
      processedCount: input.processed,
      indexedCount: input.indexed,
      currentResource: input.cursor,
    });

    if (input.cursor) {
      await upsertSyncCursor(db, {
        connectorId: input.connectorId,
        resource: "default",
        cursor: input.cursor,
      });
    }

    const progress =
      input.total > 0 ? Math.round((input.processed / input.total) * 100) : 0;

    await publishJobProgress(input.teamId, {
      id: input.workflowId,
      teamId: input.teamId,
      type: "sync",
      status: mapStageToStatus(input.stage),
      connectorId: input.connectorId,
      connectorName: input.connectorName,
      progress,
      currentPhase: input.stage,
      currentItem: input.progressMessage,
      itemsTotal: input.total,
      itemsProcessed: input.processed,
      itemsFailed: input.errors,
      startedAt: new Date().toISOString(),
    });
  };
}
