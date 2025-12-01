import type { SyncJobData } from "@openplane/redis";
import type { ProcessorResult } from "../types";
import { createWorker } from "../worker-factory";
import { processSyncJob } from "./handler";

export function createSyncProcessor(): ProcessorResult {
  return createWorker<SyncJobData, { synced: number }>({
    queueName: "sync",
    handler: processSyncJob,
    concurrency: 5,
    limiter: {
      max: 10,
      duration: 1000,
    },
  });
}

export { calculateOptimalBatchSize, enqueueBatches } from "./batching";
export {
  acquireFence,
  checkFenceStatus,
  releaseFence,
  validateFence,
} from "./fence";
export { processSyncJob } from "./handler";
