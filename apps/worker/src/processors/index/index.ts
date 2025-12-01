import { getIndexRetryStrategy, type IndexJobData } from "@openplane/redis";
import type { ProcessorResult } from "../types";
import { createWorker } from "../worker-factory";
import { processIndexJob } from "./handler";

export function createIndexProcessor(): ProcessorResult {
  return createWorker<IndexJobData, { indexed: number }>({
    queueName: "index",
    handler: processIndexJob,
    concurrency: 10,
    limiter: {
      max: 50,
      duration: 1000,
    },
    workerOptions: {
      settings: {
        backoffStrategy: (attemptsMade: number) =>
          getIndexRetryStrategy(attemptsMade, new Error("Retry attempt")),
      },
    },
  });
}

export { processIndexJob } from "./handler";
