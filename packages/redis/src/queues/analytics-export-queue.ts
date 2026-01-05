import { Queue } from "bullmq";
import { z } from "zod";
import { getSharedBullMqConnection } from "../client";

export const ANALYTICS_EXPORT_QUEUE_NAME = "analytics-export";

export const AnalyticsExportJobDataSchema = z.object({
  teamId: z.string(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  triggeredAt: z.number(),
});

export type AnalyticsExportJobData = z.infer<
  typeof AnalyticsExportJobDataSchema
>;

export const analyticsExportQueue = new Queue<AnalyticsExportJobData>(
  ANALYTICS_EXPORT_QUEUE_NAME,
  {
    connection: getSharedBullMqConnection(),
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 5000,
      },
      removeOnComplete: { count: 100, age: 24 * 3600 },
      removeOnFail: { count: 100, age: 7 * 24 * 3600 },
    },
  }
);

export async function addAnalyticsExportJob(
  teamId: string,
  date: string
): Promise<string> {
  const job = await analyticsExportQueue.add(
    "export",
    {
      teamId,
      date,
      triggeredAt: Date.now(),
    },
    {
      jobId: `analytics-export-${teamId}-${date}`,
    }
  );

  return job.id ?? "";
}

export async function createRepeatableAnalyticsExportJob(
  cron = "0 3 * * *"
): Promise<string> {
  const schedulerId = "daily-analytics-export";

  await analyticsExportQueue.upsertJobScheduler(
    schedulerId,
    {
      pattern: cron,
    },
    {
      name: "daily-analytics-export",
      data: {
        teamId: "__all__",
        date: "__yesterday__",
        triggeredAt: 0,
      },
    }
  );

  return schedulerId;
}

export async function removeRepeatableAnalyticsExportJob(): Promise<void> {
  const schedulerId = "daily-analytics-export";
  try {
    await analyticsExportQueue.removeJobScheduler(schedulerId);
  } catch {
    console.warn("Failed to remove analytics export job scheduler");
  }
}

export async function closeAnalyticsExportQueue(): Promise<void> {
  await analyticsExportQueue.close();
}
