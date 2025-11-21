/**
 * Adaptive Batch Sizing
 * 
 * Dynamically adjusts batch sizes based on:
 * - Document size
 * - Vespa response time
 * - Error rate
 * - Connector type
 */

import type { ConnectorType } from "@openplane/db";

interface BatchMetrics {
  avgResponseTimeMs: number;
  errorRate: number;
  lastBatchSize: number;
}

/**
 * Default batch sizes per connector type
 */
const DEFAULT_BATCH_SIZES: Record<ConnectorType, number> = {
  SLACK: 200,
  NOTION: 100,
  DRIVE: 50,
  JIRA: 100,
  CONFLUENCE: 100,
  GITHUB: 150,
  LINEAR: 100,
  GMAIL: 100,
};

const MIN_BATCH_SIZE = 10;
const MAX_BATCH_SIZE = 500;

/**
 * Calculate optimal batch size based on metrics
 */
export function calculateBatchSize(
  connectorType: ConnectorType,
  metrics?: Partial<BatchMetrics>,
  avgDocSizeKb?: number
): number {
  let batchSize = DEFAULT_BATCH_SIZES[connectorType] || 100;

  // Adjust based on document size
  if (avgDocSizeKb) {
    if (avgDocSizeKb > 100) {
      // Large docs (>100KB) - reduce batch size
      batchSize = Math.floor(batchSize * 0.5);
    } else if (avgDocSizeKb < 10) {
      // Small docs (<10KB) - increase batch size
      batchSize = Math.floor(batchSize * 1.5);
    }
  }

  // Adjust based on response time
  if (metrics?.avgResponseTimeMs) {
    if (metrics.avgResponseTimeMs > 5000) {
      // Slow responses (>5s) - reduce batch size
      batchSize = Math.floor(batchSize * 0.7);
    } else if (metrics.avgResponseTimeMs < 1000) {
      // Fast responses (<1s) - increase batch size
      batchSize = Math.floor(batchSize * 1.2);
    }
  }

  // Adjust based on error rate
  if (metrics?.errorRate) {
    if (metrics.errorRate > 0.1) {
      // High error rate (>10%) - reduce batch size
      batchSize = Math.floor(batchSize * 0.5);
    }
  }

  // Clamp to min/max
  return Math.max(MIN_BATCH_SIZE, Math.min(MAX_BATCH_SIZE, batchSize));
}

/**
 * Batch size tracker for adaptive sizing
 */
export class BatchSizeTracker {
  private metrics = new Map<string, BatchMetrics>();

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

    // Exponential moving average
    const alpha = 0.3;
    this.metrics.set(connectorId, {
      avgResponseTimeMs:
        alpha * responseTimeMs + (1 - alpha) * existing.avgResponseTimeMs,
      errorRate: alpha * (errorCount / batchSize) + (1 - alpha) * existing.errorRate,
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

