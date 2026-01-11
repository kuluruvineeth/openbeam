import type { EmergenceDetectionJobData } from "@openplane/redis";
import type { ProcessorResult } from "../types";
import { createWorker } from "../worker-factory";
import { processEmergenceDetectionJob } from "./handler";

export function createEmergenceDetectionProcessor(): ProcessorResult {
  return createWorker<
    EmergenceDetectionJobData,
    ReturnType<typeof processEmergenceDetectionJob> extends Promise<infer R>
      ? R
      : never
  >({
    queueName: "emergence-detection",
    handler: processEmergenceDetectionJob,
    concurrency: 1,
    limiter: {
      max: 1,
      duration: 60_000,
    },
  });
}

export {
  processEmergenceDetectionJob,
  recordCompositionEvent,
  triggerEmergenceAnalysisManual,
} from "./handler";
