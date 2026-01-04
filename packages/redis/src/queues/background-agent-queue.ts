import { Queue } from "bullmq";
import { z } from "zod";
import { getSharedBullMqConnection } from "../client";
import { extractTraceContext } from "../utils/trace-context";

export type BackgroundAgentStatus =
  | "PENDING"
  | "INITIALIZING"
  | "RUNNING"
  | "PAUSED"
  | "AWAITING_INPUT"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED"
  | "TIMED_OUT";

export type BackgroundAgentPreset =
  | "researcher"
  | "coder"
  | "analyst"
  | "writer"
  | "custom";

export const BackgroundAgentJobDataSchema = z.object({
  agentId: z.string().uuid(),
  teamId: z.string().uuid(),
  userId: z.string().uuid(),
  name: z.string().min(1),
  prompt: z.string().min(1),
  preset: z.enum(["researcher", "coder", "analyst", "writer", "custom"]),
  sandboxType: z.enum(["e2b", "docker", "local"]),
  repositoryUrl: z.string().url().optional(),
  baseBranch: z.string().optional(),
  maxSteps: z.number().int().positive().optional(),
  timeoutMs: z.number().int().positive().optional(),
  resumeFromCheckpoint: z.number().int().nonnegative().optional(),
  traceContext: z
    .object({
      traceId: z.string(),
      spanId: z.string(),
      traceFlags: z.number(),
    })
    .optional(),
});

export type BackgroundAgentJobData = z.infer<
  typeof BackgroundAgentJobDataSchema
>;

export interface BackgroundAgentStatusUpdate {
  agentId: string;
  status: BackgroundAgentStatus;
  progress?: number;
  currentStep?: string;
  errorCode?: string;
  errorMessage?: string;
}

export const backgroundAgentQueue = new Queue<BackgroundAgentJobData>(
  "background-agent",
  {
    connection: getSharedBullMqConnection(),
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 5000,
      },
      removeOnComplete: {
        count: 50,
        age: 7 * 24 * 3600,
      },
      removeOnFail: {
        count: 100,
      },
    },
  }
);

export async function addBackgroundAgentJob(
  data: BackgroundAgentJobData,
  priority = 5
) {
  const jobData: BackgroundAgentJobData = {
    ...data,
    traceContext: data.traceContext ?? extractTraceContext(),
  };

  return await backgroundAgentQueue.add("background-agent", jobData, {
    priority,
    jobId: `agent-${data.agentId}`,
  });
}

export async function getBackgroundAgentJob(jobId: string) {
  return await backgroundAgentQueue.getJob(jobId);
}

export async function cancelBackgroundAgentJob(agentId: string) {
  const job = await backgroundAgentQueue.getJob(`agent-${agentId}`);

  if (!job) {
    return false;
  }

  const state = await job.getState();

  if (state === "active") {
    await job.moveToFailed(new Error("Cancelled by user"), "cancelled");
  } else if (state === "waiting" || state === "delayed") {
    await job.remove();
  }

  return true;
}

export async function pauseBackgroundAgentJob(agentId: string) {
  const job = await backgroundAgentQueue.getJob(`agent-${agentId}`);

  if (!job) {
    return false;
  }

  await job.moveToDelayed(Date.now() + 365 * 24 * 60 * 60 * 1000);
  return true;
}

export async function resumeBackgroundAgentJob(
  agentId: string,
  _checkpointVersion?: number
) {
  const existingJob = await backgroundAgentQueue.getJob(`agent-${agentId}`);

  if (existingJob) {
    const state = await existingJob.getState();
    if (state === "delayed") {
      await existingJob.changeDelay(0);
      return existingJob;
    }
  }

  return null;
}

export async function getBackgroundAgentQueueMetrics() {
  const [waiting, active, completed, failed, delayed] = await Promise.all([
    backgroundAgentQueue.getWaitingCount(),
    backgroundAgentQueue.getActiveCount(),
    backgroundAgentQueue.getCompletedCount(),
    backgroundAgentQueue.getFailedCount(),
    backgroundAgentQueue.getDelayedCount(),
  ]);

  return {
    waiting,
    active,
    completed,
    failed,
    delayed,
    total: waiting + active + completed + failed + delayed,
  };
}

export async function getActiveBackgroundAgents(
  teamId?: string
): Promise<BackgroundAgentJobData[]> {
  const jobs = await backgroundAgentQueue.getActive();

  if (!teamId) {
    return jobs.map((job) => job.data);
  }

  return jobs
    .filter((job) => job.data.teamId === teamId)
    .map((job) => job.data);
}

export async function getPendingBackgroundAgents(
  teamId?: string
): Promise<BackgroundAgentJobData[]> {
  const jobs = await backgroundAgentQueue.getWaiting();

  if (!teamId) {
    return jobs.map((job) => job.data);
  }

  return jobs
    .filter((job) => job.data.teamId === teamId)
    .map((job) => job.data);
}

export async function closeBackgroundAgentQueue(): Promise<void> {
  await backgroundAgentQueue.close();
}

export async function drainBackgroundAgentQueue(): Promise<void> {
  await backgroundAgentQueue.drain();
}

export async function cleanBackgroundAgentQueue(
  olderThanMs: number = 7 * 24 * 60 * 60 * 1000
): Promise<void> {
  await backgroundAgentQueue.clean(olderThanMs, 100, "completed");
  await backgroundAgentQueue.clean(olderThanMs, 100, "failed");
}
