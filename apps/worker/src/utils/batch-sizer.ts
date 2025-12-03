import type { AppType } from "@openplane/db";

interface BatchMetrics {
  avgResponseTimeMs: number;
  errorRate: number;
  lastBatchSize: number;
}

const DEFAULT_BATCH_SIZES: Partial<Record<AppType, number>> = {
  SLACK: 200,
  NOTION: 100,
  GOOGLE_DRIVE: 50,
  JIRA: 100,
  GITHUB: 150,
  LINEAR: 100,
};

const MIN_BATCH_SIZE = 10;
const MAX_BATCH_SIZE = 500;

export function calculateBatchSize(
  appType: AppType,
  metrics?: Partial<BatchMetrics>,
  avgDocSizeKb?: number
): number {
  let batchSize = DEFAULT_BATCH_SIZES[appType] || 100;

  if (avgDocSizeKb) {
    if (avgDocSizeKb > 100) {
      batchSize = Math.floor(batchSize * 0.5);
    } else if (avgDocSizeKb < 10) {
      batchSize = Math.floor(batchSize * 1.5);
    }
  }

  if (metrics?.avgResponseTimeMs) {
    if (metrics.avgResponseTimeMs > 5000) {
      batchSize = Math.floor(batchSize * 0.7);
    } else if (metrics.avgResponseTimeMs < 1000) {
      batchSize = Math.floor(batchSize * 1.2);
    }
  }

  if (metrics?.errorRate && metrics.errorRate > 0.1) {
    batchSize = Math.floor(batchSize * 0.5);
  }

  return Math.max(MIN_BATCH_SIZE, Math.min(MAX_BATCH_SIZE, batchSize));
}

export class BatchSizeTracker {
  private readonly metrics = new Map<string, BatchMetrics>();

  recordBatch(
    connectorId: string,
    batchSize: number,
    responseTimeMs: number,
    errorCount: number
  ): void {
    const existing = this.metrics.get(connectorId);

    if (!existing) {
      this.metrics.set(connectorId, {
        avgResponseTimeMs: responseTimeMs,
        errorRate: errorCount / batchSize,
        lastBatchSize: batchSize,
      });
      return;
    }

    const alpha = 0.3;
    this.metrics.set(connectorId, {
      avgResponseTimeMs:
        alpha * responseTimeMs + (1 - alpha) * existing.avgResponseTimeMs,
      errorRate:
        alpha * (errorCount / batchSize) + (1 - alpha) * existing.errorRate,
      lastBatchSize: batchSize,
    });
  }

  getMetrics(connectorId: string): BatchMetrics | undefined {
    return this.metrics.get(connectorId);
  }

  reset(connectorId: string): void {
    this.metrics.delete(connectorId);
  }
}

export const batchSizeTracker = new BatchSizeTracker();
