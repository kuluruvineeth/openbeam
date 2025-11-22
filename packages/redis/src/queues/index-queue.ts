import { Queue } from "bullmq";
import { getRedisConnection } from "../client";

/**
 * Generic document interface matching Vespa schema
 */
export interface GenericDocument {
  id: string;
  connector_id: string;
  connector_type: string;
  organization_id: string;
  workspace_id: string;
  external_id: string;
  document_type: string;
  title: string;
  content: string;
  author_id?: string;
  author_name?: string;
  created_at: number;
  updated_at: number;
  source_id?: string;
  source_name?: string;
  source_type?: string;
  parent_id?: string;
  thread_id?: string;
  metadata?: Record<string, unknown>;
  url?: string;
  access_control?: string[];
  is_public: boolean;
}

/**
 * Index job data interface
 * Used to index documents to Vespa
 */
export interface IndexJobData {
  connectorId: string;
  documents: GenericDocument[];
  batchId: string;
  syncHistoryId?: string; // Optional: link to sync history for tracking actual indexed counts
}

/**
 * Index queue retry strategy
 *
 * Error-specific strategies:
 * - Vespa unavailable (503): Exponential backoff with jitter
 * - Document size errors: Fail fast (don't retry)
 * - Timeout errors: Linear backoff
 * - Unknown errors: Exponential backoff
 */
export function getIndexRetryStrategy(
  attemptsMade: number,
  err: Error
): number {
  const errorMessage = err.message.toLowerCase();

  // Document too large - don't retry
  if (errorMessage.includes("too large") || errorMessage.includes("payload")) {
    return -1;
  }

  // Vespa unavailable - exponential with jitter
  if (errorMessage.includes("503") || errorMessage.includes("unavailable")) {
    const baseDelay = 2000 * 2 ** (attemptsMade - 1);
    const jitter = Math.random() * 1000;
    return Math.min(baseDelay + jitter, 20_000);
  }

  // Timeout - linear backoff
  if (errorMessage.includes("timeout") || errorMessage.includes("etimedout")) {
    return Math.min(3000 + (attemptsMade - 1) * 3000, 12_000);
  }

  // Default - exponential backoff
  return Math.min(2000 * 2 ** (attemptsMade - 1), 15_000);
}

/**
 * Index queue for document indexing jobs
 * Handles batch indexing to Vespa search engine
 */
export const indexQueue = new Queue<IndexJobData>("index", {
  connection: getRedisConnection(),
  defaultJobOptions: {
    attempts: 2,
    backoff: {
      type: "custom",
    },
    removeOnComplete: {
      count: 50,
      age: 3600, // Keep for 1 hour
    },
    removeOnFail: {
      count: 500,
    },
  },
});

/**
 * Add an index job to the queue
 */
export async function addIndexJob(data: IndexJobData) {
  return await indexQueue.add("index", data, {
    jobId: data.batchId,
  });
}

/**
 * Get index job by ID
 */
export async function getIndexJob(jobId: string) {
  return await indexQueue.getJob(jobId);
}

/**
 * Get index queue metrics
 */
export async function getIndexQueueMetrics() {
  const [waiting, active, completed, failed, delayed] = await Promise.all([
    indexQueue.getWaitingCount(),
    indexQueue.getActiveCount(),
    indexQueue.getCompletedCount(),
    indexQueue.getFailedCount(),
    indexQueue.getDelayedCount(),
  ]);

  return {
    waiting,
    active,
    completed,
    failed,
    delayed,
    total: waiting + active + completed + failed + delayed,
  };
}

export async function closeIndexQueue(): Promise<void> {
  await indexQueue.close();
}
