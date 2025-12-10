import { type AnyVideoJobData, videoProcessingQueue } from "@openplane/redis";
import { workerConfig } from "../../config";
import type { ProcessorResult } from "../types";
import { createWorker } from "../worker-factory";
import { processVideoJob, type VideoProcessingResult } from "./handler";

export function createVideoProcessor(): ProcessorResult {
  return createWorker<AnyVideoJobData, VideoProcessingResult>({
    queueName: videoProcessingQueue.name,
    handler: processVideoJob,
    concurrency: workerConfig.video.concurrency,
    limiter: workerConfig.video.rateLimit,
  });
}

export { processVideoJob, type VideoProcessingResult } from "./handler";
