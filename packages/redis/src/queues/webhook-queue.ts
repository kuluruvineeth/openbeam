import { Queue } from "bullmq";
import { getSharedBullMqConnection } from "../client";
import { extractTraceContext, type TraceContext } from "../utils/trace-context";

export interface WebhookJobData {
  connectorId: string;
  eventId: string;
  eventType: string;
  payload: Record<string, unknown>;
  source: string;
  receivedAt: Date;
  traceContext?: TraceContext;
}

export const webhookQueue = new Queue<WebhookJobData>("webhook", {
  connection: getSharedBullMqConnection(),
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 1000,
    },
    priority: 10,
    removeOnComplete: {
      count: 1000,
      age: 24 * 3600,
    },
    removeOnFail: {
      count: 5000,
      age: 7 * 24 * 3600,
    },
  },
});

export async function addWebhookJob(data: WebhookJobData, priority = 10) {
  const jobData: WebhookJobData = {
    ...data,
    traceContext: data.traceContext ?? extractTraceContext(),
  };

  return await webhookQueue.add("process-webhook", jobData, {
    priority,
    jobId: `webhook-${data.connectorId}-${data.eventId}`,
  });
}

export async function getWebhookJob(jobId: string) {
  return await webhookQueue.getJob(jobId);
}

export async function getWebhookQueueMetrics() {
  const counts = await webhookQueue.getJobCounts();
  return {
    waiting: counts.waiting || 0,
    active: counts.active || 0,
    completed: counts.completed || 0,
    failed: counts.failed || 0,
    total:
      (counts.waiting || 0) +
      (counts.active || 0) +
      (counts.completed || 0) +
      (counts.failed || 0),
  };
}

export async function closeWebhookQueue(): Promise<void> {
  await webhookQueue.close();
}
