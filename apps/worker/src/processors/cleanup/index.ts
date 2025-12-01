import type { CleanupJobData } from "@openplane/redis";
import type { ProcessorResult } from "../types";
import { createWorker } from "../worker-factory";
import { processCleanupJob } from "./handler";

export function createCleanupProcessor(): ProcessorResult {
  return createWorker<
    CleanupJobData,
    ReturnType<typeof processCleanupJob> extends Promise<infer R> ? R : never
  >({
    queueName: "cleanup",
    handler: processCleanupJob,
    concurrency: 1,
    limiter: {
      max: 1,
      duration: 1000,
    },
  });
}

export { processCleanupJob, triggerCleanup } from "./handler";
