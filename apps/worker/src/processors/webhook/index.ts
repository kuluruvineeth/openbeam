import type { WebhookJobData } from "@openplane/redis";
import type { ProcessorResult } from "../types";
import { createWorker } from "../worker-factory";
import { processWebhookJob } from "./handler";

export function createWebhookProcessor(): ProcessorResult {
  return createWorker<WebhookJobData, { triggered: boolean; reason?: string }>({
    queueName: "webhook",
    handler: processWebhookJob,
    concurrency: 20,
    limiter: {
      max: 100,
      duration: 1000,
    },
  });
}

export {
  type GmailWebhookResult,
  processGmailWebhook,
  shouldProcessGmailRealtime,
} from "./gmail-handler";
export {
  processWebhookJob,
  replayWebhookEvent,
  replayWebhooksInRange,
} from "./handler";

export {
  processSlackWebhook,
  type SlackWebhookResult,
  shouldProcessRealtime,
} from "./slack-handler";
