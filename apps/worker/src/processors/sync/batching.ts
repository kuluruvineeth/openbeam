import type { AppType } from "@openplane/db";
import { addIndexJob } from "@openplane/redis";
import { batchSizeTracker, calculateBatchSize } from "../../utils/batch-sizer";
import logger from "../../utils/logger";

export interface EnqueueBatchesInput {
  connectorId: string;
  syncJobId: string;
  documents: unknown[];
  appType: string;
}

export interface EnqueueBatchesResult {
  batchCount: number;
  totalDocuments: number;
  batchSize: number;
}

export function calculateOptimalBatchSize(
  connectorId: string,
  appType: string,
  documents: unknown[]
): number {
  const metrics = batchSizeTracker.getMetrics(connectorId);

  const avgDocSize =
    documents.length > 0
      ? documents.reduce(
          (sum: number, doc) => sum + JSON.stringify(doc).length,
          0
        ) /
        documents.length /
        1024
      : undefined;

  const batchSize = calculateBatchSize(appType as AppType, metrics, avgDocSize);

  logger.info(
    { connectorId, batchSize, avgDocSizeKb: avgDocSize?.toFixed(2) },
    "Calculated adaptive batch size"
  );

  return batchSize;
}

export async function enqueueBatches(
  input: EnqueueBatchesInput
): Promise<EnqueueBatchesResult> {
  const { connectorId, syncJobId, documents, appType } = input;

  if (documents.length === 0) {
    return { batchCount: 0, totalDocuments: 0, batchSize: 0 };
  }

  const batchSize = calculateOptimalBatchSize(connectorId, appType, documents);

  let batchCount = 0;

  for (let i = 0; i < documents.length; i += batchSize) {
    const batch = documents.slice(i, i + batchSize);
    const batchId = `${connectorId}-${Date.now()}-${i}`;
    const jobStartTime = Date.now();

    await addIndexJob({
      connectorId,
      documents: batch as never[],
      batchId,
      syncHistoryId: syncJobId,
    });

    batchSizeTracker.recordBatch(
      connectorId,
      batch.length,
      Date.now() - jobStartTime,
      0 // Errors counted separately
    );

    batchCount += 1;
  }

  logger.info(
    { connectorId, batchCount, totalDocs: documents.length },
    "Pushed batches to index queue"
  );

  return {
    batchCount,
    totalDocuments: documents.length,
    batchSize,
  };
}

export function recordBatchMetrics(
  connectorId: string,
  documentCount: number,
  durationMs: number,
  errorCount: number
): void {
  batchSizeTracker.recordBatch(
    connectorId,
    documentCount,
    durationMs,
    errorCount
  );
}
