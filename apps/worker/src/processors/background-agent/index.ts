import type { BackgroundAgentJobData } from "@openplane/redis";
import type { ProcessorResult } from "../types";
import { createWorker } from "../worker-factory";
import { processBackgroundAgentJob } from "./handler";

export function createBackgroundAgentProcessor(): ProcessorResult {
  return createWorker<
    BackgroundAgentJobData,
    ReturnType<typeof processBackgroundAgentJob> extends Promise<infer R>
      ? R
      : never
  >({
    queueName: "background-agent",
    handler: processBackgroundAgentJob,
    concurrency: 3,
    workerOptions: {
      lockDuration: 60_000 * 30,
    },
  });
}

export { processBackgroundAgentJob } from "./handler";
