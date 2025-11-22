/**
 * Webhook Queue
 *
 * High-priority queue for processing incoming webhooks.
 * Enables real-time document updates from connectors.
 */

import { Queue } from "bullmq";
import { getRedisConnection } from "../client";

export interface WebhookJobData {
  connectorId: string;
  eventId: string;
  eventType: string;
  payload: Record<string, unknown>;
  source: string; // "slack", "notion", etc.
  receivedAt: Date;
}

export const webhookQueue = new Queue<WebhookJobData>("webhook", {
  connection: getRedisConnection(),
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 1000,
    },
    priority: 10, // High priority - process before scheduled syncs
    removeOnComplete: {
      count: 1000,
      age: 24 * 3600, // Keep for 24 hours
    },
    removeOnFail: {
      count: 5000,
      age: 7 * 24 * 3600, // Keep failures for 7 days
    },
  },
});

export async function addWebhookJob(data: WebhookJobData, priority = 10) {
  return await webhookQueue.add("process-webhook", data, {
    priority,
    jobId: `webhook-${data.connectorId}-${data.eventId}`, // Prevent duplicates
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
