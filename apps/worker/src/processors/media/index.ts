import { type AnyMediaJobData, mediaProcessingQueue } from "@openplane/redis";
import { workerConfig } from "../../config";
import type { ProcessorResult } from "../types";
import { createWorker } from "../worker-factory";
import { type MediaProcessingResult, processMediaJob } from "./handler";

export function createMediaProcessor(): ProcessorResult {
  return createWorker<AnyMediaJobData, MediaProcessingResult>({
    queueName: mediaProcessingQueue.name,
    handler: processMediaJob,
    concurrency: workerConfig.media.concurrency,
    limiter: workerConfig.media.rateLimit,
  });
}

export { type MediaProcessingResult, processMediaJob } from "./handler";
