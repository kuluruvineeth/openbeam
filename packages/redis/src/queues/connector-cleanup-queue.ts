import { Queue } from "bullmq";
import { getSharedBullMqConnection } from "../client";

export const CONNECTOR_CLEANUP_QUEUE_NAME = "connector-cleanup";

const GRACE_PERIOD_MS = 72 * 60 * 60 * 1000;

export interface ConnectorCleanupJobData {
  connectorId: string;
  teamId: string;
  triggeredBy: string;
}

export const connectorCleanupQueue = new Queue<ConnectorCleanupJobData>(
  CONNECTOR_CLEANUP_QUEUE_NAME,
  {
    connection: getSharedBullMqConnection(),
    defaultJobOptions: {
      attempts: 5,
      backoff: { type: "exponential", delay: 5000 },
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 500 },
    },
  }
);

export async function scheduleConnectorCleanup(
  data: ConnectorCleanupJobData
): Promise<string> {
  const jobId = `connector-cleanup-${data.connectorId}`;

  const job = await connectorCleanupQueue.add("cleanup", data, {
    jobId,
    delay: GRACE_PERIOD_MS,
  });

  if (!job.id) {
    throw new Error("Failed to create connector cleanup job");
  }

  return job.id;
}

export async function cancelConnectorCleanup(
  connectorId: string
): Promise<boolean> {
  const jobId = `connector-cleanup-${connectorId}`;
  const job = await connectorCleanupQueue.getJob(jobId);

  if (job) {
    await job.remove();
    return true;
  }
  return false;
}

export async function getConnectorCleanupJob(connectorId: string) {
  const jobId = `connector-cleanup-${connectorId}`;
  return await connectorCleanupQueue.getJob(jobId);
}

export async function closeConnectorCleanupQueue(): Promise<void> {
  await connectorCleanupQueue.close();
}
