import type { RedisClientType } from "redis";
import { getRedisClient } from "../client";

export type JobType = "sync" | "file" | "media" | "index" | "export";

export type JobStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "cancelled";

export type JobProgress = {
  id: string;
  teamId: string;
  type: JobType;
  status: JobStatus;
  connectorId?: string;
  connectorName?: string;
  fileName?: string;
  progress: number;
  currentPhase?: string;
  currentItem?: string;
  itemsTotal: number;
  itemsProcessed: number;
  itemsFailed: number;
  startedAt: string;
  estimatedTimeRemainingMs?: number;
  error?: string;
};

const JOB_PROGRESS_CHANNEL_PREFIX = "job-progress";
const PROGRESS_THROTTLE_MS = 500;

const lastPublishTime = new Map<string, number>();

function shouldThrottle(jobId: string, status: JobStatus): boolean {
  if (status === "completed" || status === "failed" || status === "cancelled") {
    return false;
  }
  const now = Date.now();
  const lastTime = lastPublishTime.get(jobId) ?? 0;
  if (now - lastTime < PROGRESS_THROTTLE_MS) {
    return true;
  }
  lastPublishTime.set(jobId, now);
  return false;
}

export async function publishJobProgress(
  teamId: string,
  progress: JobProgress
): Promise<void> {
  if (shouldThrottle(progress.id, progress.status)) {
    return;
  }

  try {
    const client = await getRedisClient();
    const channel = `${JOB_PROGRESS_CHANNEL_PREFIX}:${teamId}`;
    await client.publish(channel, JSON.stringify(progress));
  } catch {
    // Non-critical - progress updates should not break job processing
  }
}

export async function createJobProgressSubscriber(
  teamId: string,
  onProgress: (progress: JobProgress) => void,
  onError?: (error: Error) => void
): Promise<() => Promise<void>> {
  const client = await getRedisClient();
  const subscriber = client.duplicate() as RedisClientType;

  subscriber.on("error", (err: Error) => {
    onError?.(err);
  });

  await subscriber.connect();

  const channel = `${JOB_PROGRESS_CHANNEL_PREFIX}:${teamId}`;

  await subscriber.subscribe(channel, (message) => {
    try {
      const progress = JSON.parse(message) as JobProgress;
      onProgress(progress);
    } catch {
      // Ignore malformed messages
    }
  });

  return async () => {
    try {
      await subscriber.unsubscribe(channel);
      await subscriber.quit();
    } catch {
      // Ignore cleanup errors
    }
  };
}

export type ProgressEmitterParams = {
  id: string;
  teamId: string;
  type: JobType;
  connectorId?: string;
  connectorName?: string;
  fileName?: string;
};

export function createProgressEmitter(params: ProgressEmitterParams) {
  const startedAt = new Date().toISOString();
  let itemsProcessed = 0;
  let itemsFailed = 0;

  return {
    start: (itemsTotal: number, currentPhase?: string) =>
      publishJobProgress(params.teamId, {
        ...params,
        status: "running",
        progress: 0,
        currentPhase,
        itemsTotal,
        itemsProcessed: 0,
        itemsFailed: 0,
        startedAt,
      }),

    update: (
      processed: number,
      total: number,
      currentPhase?: string,
      currentItem?: string
    ) => {
      itemsProcessed = processed;
      return publishJobProgress(params.teamId, {
        ...params,
        status: "running",
        progress: total > 0 ? Math.round((processed / total) * 100) : 0,
        currentPhase,
        currentItem,
        itemsTotal: total,
        itemsProcessed: processed,
        itemsFailed,
        startedAt,
      });
    },

    complete: (total: number) => {
      lastPublishTime.delete(params.id);
      return publishJobProgress(params.teamId, {
        ...params,
        status: "completed",
        progress: 100,
        itemsTotal: total,
        itemsProcessed: total,
        itemsFailed,
        startedAt,
      });
    },

    fail: (error: string, total: number) => {
      lastPublishTime.delete(params.id);
      itemsFailed += 1;
      return publishJobProgress(params.teamId, {
        ...params,
        status: "failed",
        progress: total > 0 ? Math.round((itemsProcessed / total) * 100) : 0,
        itemsTotal: total,
        itemsProcessed,
        itemsFailed,
        error,
        startedAt,
      });
    },
  };
}
