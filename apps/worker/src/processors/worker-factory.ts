import { getSharedBullMqConnection } from "@openplane/redis";
import { type Job, Worker, type WorkerOptions } from "bullmq";
import logger from "../utils/logger";
import { setupEventHandlers } from "./event-handlers";
import type { JobHandler, ProcessorResult } from "./types";

export interface WorkerFactoryOptions<TData, TResult> {
  queueName: string;
  handler: JobHandler<TData, TResult>;
  concurrency?: number;
  limiter?: { max: number; duration: number };
  workerOptions?: Partial<WorkerOptions>;
}

export function createWorker<TData, TResult>(
  options: WorkerFactoryOptions<TData, TResult>
): ProcessorResult {
  const {
    queueName,
    handler,
    concurrency = 1,
    limiter,
    workerOptions = {},
  } = options;

  const connection = getSharedBullMqConnection();

  const worker = new Worker<TData, TResult>(
    queueName,
    async (job: Job<TData>) => handler(job),
    {
      connection,
      concurrency,
      limiter,
      ...workerOptions,
    }
  );

  setupEventHandlers(worker, queueName);

  logger.info(
    { queueName, concurrency, hasLimiter: !!limiter },
    "Worker created"
  );

  return {
    worker,
    close: async () => {
      await worker.close();
      logger.info({ queueName }, "Worker closed");
    },
  };
}

export function getConnectorIdFromJob<TData>(
  job: Job<TData>
): string | undefined {
  const data = job.data as Record<string, unknown>;
  return data?.connectorId as string | undefined;
}
