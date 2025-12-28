import type { LTRTrainingJobData } from "@openplane/redis";
import type { ProcessorResult } from "../types";
import { createWorker } from "../worker-factory";
import { processLTRTrainingJob } from "./handler";

export function createLTRTrainingProcessor(): ProcessorResult {
  return createWorker<LTRTrainingJobData, { success: boolean }>({
    queueName: "ltr-training",
    handler: processLTRTrainingJob,
    concurrency: 1,
    workerOptions: {
      lockDuration: 600_000,
    },
  });
}

export { processLTRTrainingJob } from "./handler";
