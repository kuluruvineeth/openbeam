import {
  getReembedQueueMetrics,
  getSharedBullMqConnection,
  type ReembedJobData,
  reembedQueue,
} from "@openplane/redis";
import { Worker } from "bullmq";
import logger from "../../utils/logger";
import { processReembedJob, type ReembedJobResult } from "./handler";

let worker: Worker<ReembedJobData, ReembedJobResult> | null = null;

export function startReembedWorker(): Worker<ReembedJobData, ReembedJobResult> {
  if (worker) {
    return worker;
  }

  worker = new Worker<ReembedJobData, ReembedJobResult>(
    reembedQueue.name,
    processReembedJob,
    {
      connection: getSharedBullMqConnection(),
      concurrency: 1,
      lockDuration: 300_000, // 5 minutes - embedding takes time
      lockRenewTime: 60_000, // Renew lock every minute
    }
  );

  worker.on("completed", (job, result) => {
    logger.info(
      {
        jobId: job.id,
        teamId: job.data.teamId,
        processed: result.processed,
        failed: result.failed,
        remaining: result.remaining,
        hasMore: result.hasMore,
      },
      "Reembed job completed"
    );
  });

  worker.on("failed", (job, error) => {
    logger.error(
      {
        jobId: job?.id,
        teamId: job?.data.teamId,
        error: error.message,
      },
      "Reembed job failed"
    );
  });

  logger.info("Reembed worker started");
  return worker;
}

export async function stopReembedWorker(): Promise<void> {
  if (worker) {
    await worker.close();
    worker = null;
    logger.info("Reembed worker stopped");
  }
}

export { getReembedQueueMetrics };
