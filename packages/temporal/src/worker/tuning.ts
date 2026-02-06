import os from "node:os";
import type { WorkerOptions as TemporalWorkerOptions } from "@temporalio/worker";
import { WORKER_CONSTANTS } from "../config/constants";

export interface WorkerTuningConfig {
  maxConcurrentActivities: number;
  maxConcurrentWorkflows: number;
  maxCachedWorkflows: number;
  stickyQueueScheduleToStartTimeoutMs: number;
}

export interface ResourceSnapshot {
  cpuCount: number;
  totalMemoryMb: number;
  freeMemoryMb: number;
  usedMemoryMb: number;
  memoryUsagePercent: number;
  loadAverage: number[];
  uptimeSeconds: number;
}

export interface WorkerHealthMetrics {
  resources: ResourceSnapshot;
  tuning: WorkerTuningConfig;
  timestamp: number;
}

const TUNING_CONSTANTS = {
  MIN_CONCURRENT_ACTIVITIES: 4,
  MAX_CONCURRENT_ACTIVITIES: WORKER_CONSTANTS.DEFAULT_MAX_CONCURRENT_ACTIVITIES,
  ACTIVITIES_PER_CPU: 3,

  MIN_CONCURRENT_WORKFLOWS: 10,
  MAX_CONCURRENT_WORKFLOWS: 200,
  MEMORY_PER_WORKFLOW_MB: 20,

  MIN_CACHED_WORKFLOWS: 50,
  MAX_CACHED_WORKFLOWS: WORKER_CONSTANTS.DEFAULT_MAX_CACHED_WORKFLOWS,
  CACHE_MEMORY_PERCENT: 0.15,
  MEMORY_PER_CACHED_WORKFLOW_MB: 10,

  DEFAULT_STICKY_TIMEOUT_MS: WORKER_CONSTANTS.DEFAULT_STICKY_TIMEOUT_MS,
} as const;

export function getResourceSnapshot(): ResourceSnapshot {
  const cpuCount = os.cpus().length;
  const totalMemoryMb = Math.floor(os.totalmem() / 1024 / 1024);
  const freeMemoryMb = Math.floor(os.freemem() / 1024 / 1024);
  const usedMemoryMb = totalMemoryMb - freeMemoryMb;
  const memoryUsagePercent = Math.round((usedMemoryMb / totalMemoryMb) * 100);

  return {
    cpuCount,
    totalMemoryMb,
    freeMemoryMb,
    usedMemoryMb,
    memoryUsagePercent,
    loadAverage: os.loadavg(),
    uptimeSeconds: Math.floor(os.uptime()),
  };
}

export function calculateOptimalTuning(
  resources?: ResourceSnapshot
): WorkerTuningConfig {
  const snapshot = resources ?? getResourceSnapshot();

  const cpuBasedActivities =
    snapshot.cpuCount * TUNING_CONSTANTS.ACTIVITIES_PER_CPU;
  const maxConcurrentActivities = clamp(
    cpuBasedActivities,
    TUNING_CONSTANTS.MIN_CONCURRENT_ACTIVITIES,
    TUNING_CONSTANTS.MAX_CONCURRENT_ACTIVITIES
  );

  const memoryBasedWorkflows = Math.floor(
    snapshot.freeMemoryMb / TUNING_CONSTANTS.MEMORY_PER_WORKFLOW_MB
  );
  const maxConcurrentWorkflows = clamp(
    memoryBasedWorkflows,
    TUNING_CONSTANTS.MIN_CONCURRENT_WORKFLOWS,
    TUNING_CONSTANTS.MAX_CONCURRENT_WORKFLOWS
  );

  const cacheMemoryBudget =
    snapshot.totalMemoryMb * TUNING_CONSTANTS.CACHE_MEMORY_PERCENT;
  const cachedWorkflowsFromMemory = Math.floor(
    cacheMemoryBudget / TUNING_CONSTANTS.MEMORY_PER_CACHED_WORKFLOW_MB
  );
  const maxCachedWorkflows = clamp(
    cachedWorkflowsFromMemory,
    TUNING_CONSTANTS.MIN_CACHED_WORKFLOWS,
    TUNING_CONSTANTS.MAX_CACHED_WORKFLOWS
  );

  return {
    maxConcurrentActivities,
    maxConcurrentWorkflows,
    maxCachedWorkflows,
    stickyQueueScheduleToStartTimeoutMs:
      TUNING_CONSTANTS.DEFAULT_STICKY_TIMEOUT_MS,
  };
}

export function applyTuningToWorkerOptions(
  baseOptions: Partial<TemporalWorkerOptions>,
  tuning?: WorkerTuningConfig
): Partial<TemporalWorkerOptions> {
  const config = tuning ?? calculateOptimalTuning();

  return {
    ...baseOptions,
    maxConcurrentActivityTaskExecutions: config.maxConcurrentActivities,
    maxConcurrentWorkflowTaskExecutions: config.maxConcurrentWorkflows,
    maxCachedWorkflows: config.maxCachedWorkflows,
    stickyQueueScheduleToStartTimeout:
      config.stickyQueueScheduleToStartTimeoutMs,
  };
}

export function getWorkerHealthMetrics(): WorkerHealthMetrics {
  const resources = getResourceSnapshot();
  const tuning = calculateOptimalTuning(resources);

  return {
    resources,
    tuning,
    timestamp: Date.now(),
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
