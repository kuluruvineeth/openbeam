import {
  type FileProcessingJobData,
  fileProcessingQueue,
} from "@openplane/redis";
import { workerConfig } from "../../config";
import type { ProcessorResult } from "../types";
import { createWorker } from "../worker-factory";
import { type FileProcessingResult, processFileJob } from "./handler";

export function createFileProcessor(): ProcessorResult {
  return createWorker<FileProcessingJobData, FileProcessingResult>({
    queueName: fileProcessingQueue.name,
    handler: processFileJob,
    concurrency: workerConfig.file.concurrency,
    limiter: workerConfig.file.rateLimit,
  });
}

export { type FileProcessingResult, processFileJob } from "./handler";
export {
  type FileDiscoveryOptions,
  type FileDiscoveryResult,
  processDiscoveredFiles,
} from "./sync-helper";
