import type { Database } from "@openbeam/db";
import { createSyncHistory, recordBatchProgress } from "@openbeam/db";

export function createSyncHistoryRecord(
  db: Database,
  syncJobId: string,
  connectorId: string
): Promise<{ id: string }> {
  return createSyncHistory(db, { syncJobId, connectorId });
}

export interface RecordBatchIndexedInput {
  db: Database;
  syncHistoryId: string;
  batchNumber: number;
  totalBatches: number;
  itemsInBatch: number;
  resource: string;
}

export async function recordBatchIndexed(
  input: RecordBatchIndexedInput
): Promise<void> {
  await recordBatchProgress(input.db, {
    syncHistoryId: input.syncHistoryId,
    batchNumber: input.batchNumber,
    totalBatches: input.totalBatches,
    itemsInBatch: input.itemsInBatch,
    resource: input.resource,
  });
}
