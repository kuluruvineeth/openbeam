import { Queue } from "bullmq";
import { getSharedBullMqConnection } from "../client";
import { extractTraceContext, type TraceContext } from "../utils/trace-context";

export interface IndexableDocument {
  id: string;
  connector_id: string;
  connector_type: string;
  team_id: string;
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

export interface IndexJobData {
  connectorId: string;
  documents: IndexableDocument[];
  batchId: string;
  syncHistoryId?: string;
  traceContext?: TraceContext;
}

export function getIndexRetryStrategy(
  attemptsMade: number,
  err: Error
): number {
  const errorMessage = err.message.toLowerCase();

  if (errorMessage.includes("too large") || errorMessage.includes("payload")) {
    return -1;
  }

  if (errorMessage.includes("503") || errorMessage.includes("unavailable")) {
    const baseDelay = 2000 * 2 ** (attemptsMade - 1);
    const jitter = Math.random() * 1000;
    return Math.min(baseDelay + jitter, 20_000);
  }

  if (errorMessage.includes("timeout") || errorMessage.includes("etimedout")) {
    return Math.min(3000 + (attemptsMade - 1) * 3000, 12_000);
  }

  return Math.min(2000 * 2 ** (attemptsMade - 1), 15_000);
}

export const indexQueue = new Queue<IndexJobData>("index", {
  connection: getSharedBullMqConnection(),
  defaultJobOptions: {
    attempts: 2,
    backoff: {
      type: "custom",
    },
    removeOnComplete: {
      count: 50,
      age: 3600,
    },
    removeOnFail: {
      count: 500,
    },
  },
});

export async function addIndexJob(data: IndexJobData) {
  const jobData: IndexJobData = {
    ...data,
    traceContext: data.traceContext ?? extractTraceContext(),
  };

  return await indexQueue.add("index", jobData, {
    jobId: data.batchId,
  });
}

export async function getIndexJob(jobId: string) {
  return await indexQueue.getJob(jobId);
}

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
