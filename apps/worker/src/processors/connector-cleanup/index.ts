import {
  CONNECTOR_CLEANUP_QUEUE_NAME,
  type ConnectorCleanupJobData,
} from "@openplane/redis";
import type { ProcessorResult } from "../types";
import { createWorker } from "../worker-factory";
import { processConnectorCleanup } from "./handler";

export function createConnectorCleanupProcessor(): ProcessorResult {
  return createWorker<
    ConnectorCleanupJobData,
    ReturnType<typeof processConnectorCleanup> extends Promise<infer R>
      ? R
      : never
  >({
    queueName: CONNECTOR_CLEANUP_QUEUE_NAME,
    handler: processConnectorCleanup,
    concurrency: 1,
    limiter: {
      max: 1,
      duration: 1000,
    },
  });
}

export { processConnectorCleanup } from "./handler";
