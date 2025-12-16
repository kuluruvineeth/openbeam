import type { DigestJobData } from "@openplane/redis";
import type { ProcessorResult } from "../types";
import { createWorker } from "../worker-factory";
import { processDigestJob } from "./handler";

export function createDigestProcessor(): ProcessorResult {
  return createWorker<
    DigestJobData,
    ReturnType<typeof processDigestJob> extends Promise<infer R> ? R : never
  >({
    queueName: "digest",
    handler: processDigestJob,
    concurrency: 5,
    limiter: {
      max: 10,
      duration: 1000,
    },
  });
}

export { processDigestJob } from "./handler";
