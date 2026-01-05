import type { AnalyticsExportJobData } from "@openplane/redis";
import type { ProcessorResult } from "../types";
import { createWorker } from "../worker-factory";
import { processAnalyticsExportJob } from "./handler";

export function createAnalyticsExportProcessor(): ProcessorResult {
  return createWorker<
    AnalyticsExportJobData,
    ReturnType<typeof processAnalyticsExportJob> extends Promise<infer R>
      ? R
      : never
  >({
    queueName: "analytics-export",
    handler: processAnalyticsExportJob,
    concurrency: 2,
    limiter: {
      max: 5,
      duration: 1000,
    },
  });
}

export {
  processAnalyticsExportJob,
  triggerAllTeamsExport,
  triggerAnalyticsExport,
} from "./handler";
