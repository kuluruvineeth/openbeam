import { Queue } from "bullmq";
import { getSharedBullMqConnection } from "../client";

export const EMERGENCE_DETECTION_QUEUE_NAME = "emergence-detection";

export type EmergenceDetectionJobType =
  | "WEEKLY_ANALYSIS"
  | "PATTERN_VALIDATION"
  | "COMPOSITION_AGGREGATION";

export interface EmergenceDetectionJobData {
  type: EmergenceDetectionJobType;
  triggeredAt: number;
  teamId?: string;
  dateRange?: {
    start: number;
    end: number;
  };
  minFrequency?: number;
  minSuccessRate?: number;
}

export interface EmergencePattern {
  signature: string;
  toolSequence: string[];
  frequency: number;
  successRate: number;
  avgLatencyMs: number;
  firstSeen: number;
  lastSeen: number;
  status: "observed" | "validated" | "formalized" | "rejected";
  examples: Array<{
    prompt: string;
    outcome: string;
    timestamp: number;
  }>;
}

export interface CompositionEvent {
  sessionId: string;
  teamId: string;
  userId: string;
  toolSequence: string[];
  success: boolean;
  latencyMs: number;
  promptCategory: string;
  timestamp: number;
}

export const emergenceDetectionQueue = new Queue<EmergenceDetectionJobData>(
  EMERGENCE_DETECTION_QUEUE_NAME,
  {
    connection: getSharedBullMqConnection(),
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 5000,
      },
      removeOnComplete: { count: 50 },
      removeOnFail: { count: 50 },
    },
  }
);

export async function createWeeklyEmergenceAnalysisJob(
  cron = "0 9 * * 1"
): Promise<string> {
  const schedulerId = "weekly-emergence-analysis";

  await emergenceDetectionQueue.upsertJobScheduler(
    schedulerId,
    { pattern: cron },
    {
      name: "weekly-emergence-analysis",
      data: {
        type: "WEEKLY_ANALYSIS",
        triggeredAt: Date.now(),
        minFrequency: 50,
        minSuccessRate: 0.8,
      },
    }
  );

  return schedulerId;
}

export async function triggerEmergenceAnalysis(
  options: {
    teamId?: string;
    dateRange?: { start: number; end: number };
    minFrequency?: number;
    minSuccessRate?: number;
  } = {}
): Promise<string> {
  const job = await emergenceDetectionQueue.add(
    "manual-emergence-analysis",
    {
      type: "WEEKLY_ANALYSIS",
      triggeredAt: Date.now(),
      ...options,
    },
    {
      priority: 5,
      jobId: `emergence-analysis-${Date.now()}`,
    }
  );

  return job.id ?? "unknown";
}

export async function triggerCompositionAggregation(
  teamId: string,
  dateRange: { start: number; end: number }
): Promise<string> {
  const job = await emergenceDetectionQueue.add(
    "composition-aggregation",
    {
      type: "COMPOSITION_AGGREGATION",
      triggeredAt: Date.now(),
      teamId,
      dateRange,
    },
    {
      priority: 10,
      jobId: `composition-agg-${teamId}-${Date.now()}`,
    }
  );

  return job.id ?? "unknown";
}

export async function closeEmergenceDetectionQueue(): Promise<void> {
  await emergenceDetectionQueue.close();
}
