import type { Database } from "@openplane/db";
import {
  updateConnectorSyncError,
  updateConnectorSyncSuccess,
} from "@openplane/db";
import { updateSyncCursor } from "./cursor";
import { completeSyncHistoryRecord, markSyncHistoryFailed } from "./history";
import type { HandleSyncErrorInput, UpdateSyncCompletionInput } from "./types";

export async function updateSyncCompletion(
  db: Database,
  input: UpdateSyncCompletionInput
): Promise<void> {
  const {
    connectorId,
    syncHistoryId,
    nextCursor,
    documentCount,
    batchCount,
    startTime,
  } = input;
  const durationMs = Date.now() - startTime;

  if (nextCursor) {
    await updateSyncCursor(db, connectorId, nextCursor);
  }

  await completeSyncHistoryRecord(
    db,
    syncHistoryId,
    {
      totalDocuments: documentCount,
      batches: batchCount,
      documentsFetched: documentCount,
    },
    durationMs
  );

  await updateConnectorSyncSuccess(db, { connectorId });
}

export async function handleSyncError(
  db: Database,
  input: HandleSyncErrorInput
): Promise<void> {
  const { connectorId, syncHistoryId, error } = input;
  const errorMessage = error instanceof Error ? error.message : "Unknown error";

  await markSyncHistoryFailed(db, syncHistoryId, error);

  await updateConnectorSyncError(db, {
    connectorId,
    errorMessage,
  });
}
