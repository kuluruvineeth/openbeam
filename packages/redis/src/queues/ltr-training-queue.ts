import { Queue } from "bullmq";
import { getSharedBullMqConnection } from "../client";
import { extractTraceContext, type TraceContext } from "../utils/trace-context";

export interface LTRTrainingJobData {
  teamId: string;
  modelVersion: string;
  fromDate: string;
  toDate: string;
  minSamples?: number;
  traceContext?: TraceContext;
}

export const ltrTrainingQueue = new Queue<LTRTrainingJobData>("ltr-training", {
  connection: getSharedBullMqConnection(),
  defaultJobOptions: {
    attempts: 2,
    backoff: {
      type: "exponential",
      delay: 30_000,
    },
    removeOnComplete: {
      count: 50,
      age: 7 * 24 * 3600,
    },
    removeOnFail: {
      count: 100,
    },
  },
});

export function addLTRTrainingJob(
  data: Omit<LTRTrainingJobData, "traceContext">
) {
  const jobData: LTRTrainingJobData = {
    ...data,
    traceContext: extractTraceContext(),
  };

  return ltrTrainingQueue.add("train", jobData, {
    jobId: `ltr-train-${data.teamId}-${data.modelVersion}`,
  });
}

export async function getLTRTrainingQueueMetrics() {
  const [waiting, active, completed, failed] = await Promise.all([
    ltrTrainingQueue.getWaitingCount(),
    ltrTrainingQueue.getActiveCount(),
    ltrTrainingQueue.getCompletedCount(),
    ltrTrainingQueue.getFailedCount(),
  ]);

  return { waiting, active, completed, failed };
}

export async function closeLTRTrainingQueue(): Promise<void> {
  await ltrTrainingQueue.close();
}
