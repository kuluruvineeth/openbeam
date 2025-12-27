import { Queue } from "bullmq";
import { getSharedBullMqConnection } from "../client";
import { extractTraceContext, type TraceContext } from "../utils/trace-context";

export interface ReembedJobData {
  teamId: string;
  batchSize?: number;
  offset?: number;
  traceContext?: TraceContext;
}

export const reembedQueue = new Queue<ReembedJobData>("reembed", {
  connection: getSharedBullMqConnection(),
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 5000,
    },
    removeOnComplete: {
      count: 100,
      age: 86_400,
    },
    removeOnFail: {
      count: 500,
      age: 604_800,
    },
  },
});

export async function addReembedJob(data: ReembedJobData) {
  const jobData: ReembedJobData = {
    ...data,
    batchSize: data.batchSize ?? 20,
    traceContext: data.traceContext ?? extractTraceContext(),
  };

  return await reembedQueue.add("reembed", jobData, {
    jobId: `reembed:${data.teamId}:${Date.now()}`,
  });
}

export async function getReembedQueueMetrics() {
  const [waiting, active, completed, failed, delayed] = await Promise.all([
    reembedQueue.getWaitingCount(),
    reembedQueue.getActiveCount(),
    reembedQueue.getCompletedCount(),
    reembedQueue.getFailedCount(),
    reembedQueue.getDelayedCount(),
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

export async function closeReembedQueue(): Promise<void> {
  await reembedQueue.close();
}
