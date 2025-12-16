import { Queue } from "bullmq";
import { getSharedBullMqConnection } from "../client";

export const DIGEST_QUEUE_NAME = "digest";

export interface DigestJobData {
  subscriptionId: string;
  connectorId: string;
  userId: string;
  slackUserId: string;
  teamId: string;
  channelIds: string[];
  topics: string[];
  deliveryTime: string;
  timezone: string;
  frequency: "daily" | "weekly";
  triggeredAt: number;
}

export const digestQueue = new Queue<DigestJobData>(DIGEST_QUEUE_NAME, {
  connection: getSharedBullMqConnection(),
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 2000,
    },
    removeOnComplete: { count: 500 },
    removeOnFail: { count: 200 },
  },
});

export async function addDigestJob(data: DigestJobData): Promise<string> {
  const hourKey = Math.floor(data.triggeredAt / 3_600_000);
  const job = await digestQueue.add("digest", data, {
    jobId: `digest-${data.subscriptionId}-${hourKey}`,
  });
  return job.id ?? "";
}

export interface RepeatableDigestJobData {
  subscriptionId: string;
  connectorId: string;
  userId: string;
  slackUserId: string;
  teamId: string;
  channelIds: string[];
  topics: string[];
  deliveryTime: string;
  timezone: string;
  frequency: "daily" | "weekly";
}

export async function createRepeatableDigestJob(
  subscriptionId: string,
  cronExpression: string,
  data: RepeatableDigestJobData
): Promise<string> {
  const schedulerId = `digest-${subscriptionId}`;

  await digestQueue.upsertJobScheduler(
    schedulerId,
    { pattern: cronExpression },
    {
      name: "digest-repeatable",
      data: {
        ...data,
        triggeredAt: 0,
      },
    }
  );

  return schedulerId;
}

export async function removeRepeatableDigestJob(
  schedulerId: string
): Promise<void> {
  try {
    await digestQueue.removeJobScheduler(schedulerId);
  } catch {
    // Expected: scheduler may not exist if subscription was never scheduled or already removed
  }
}

export async function getDigestJobSchedulers(): Promise<
  Array<{ id: string; pattern: string; next: number }>
> {
  const schedulers = await digestQueue.getJobSchedulers();
  return schedulers
    .filter(
      (s): s is typeof s & { id: string } =>
        typeof s.id === "string" && s.id.startsWith("digest-")
    )
    .map((s) => ({
      id: s.id,
      pattern: s.pattern ?? "",
      next: s.next ?? 0,
    }));
}

export function toUtcCron(
  deliveryTime: string,
  timezone: string,
  frequency: "daily" | "weekly"
): string {
  const [hourStr, minuteStr] = deliveryTime.split(":");
  const localHour = Number.parseInt(hourStr ?? "9", 10);
  const localMinute = Number.parseInt(minuteStr ?? "0", 10);

  const offsetMinutes = getTimezoneOffsetMinutes(timezone);
  let utcMinutes = localHour * 60 + localMinute - offsetMinutes;

  if (utcMinutes < 0) {
    utcMinutes += 24 * 60;
  } else if (utcMinutes >= 24 * 60) {
    utcMinutes -= 24 * 60;
  }

  const utcHour = Math.floor(utcMinutes / 60);
  const utcMinute = utcMinutes % 60;

  if (frequency === "weekly") {
    return `${utcMinute} ${utcHour} * * 1`;
  }
  return `${utcMinute} ${utcHour} * * *`;
}

function getTimezoneOffsetMinutes(timezone: string): number {
  const now = new Date();
  const utcDate = new Date(now.toLocaleString("en-US", { timeZone: "UTC" }));
  const tzDate = new Date(now.toLocaleString("en-US", { timeZone: timezone }));
  return Math.round((tzDate.getTime() - utcDate.getTime()) / 60_000);
}

export async function closeDigestQueue(): Promise<void> {
  await digestQueue.close();
}
