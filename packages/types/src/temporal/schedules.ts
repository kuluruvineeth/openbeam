import { z } from "zod";

export const ScheduleConfigSchema = z.object({
  workflowType: z.string(),
  cronSchedule: z.string(),
  input: z.record(z.string(), z.unknown()).optional(),
  timezone: z.string().optional(),
  paused: z.boolean().optional(),
});

export type ScheduleConfig = z.infer<typeof ScheduleConfigSchema>;

export const TEMPORAL_SCHEDULES = {
  fullSync: {
    workflowType: "connectorSyncWorkflow",
    cronSchedule: "0 2 * * *",
    input: { syncType: "FULL", trigger: "SCHEDULE" },
  },
  incrementalSync: {
    workflowType: "connectorSyncWorkflow",
    cronSchedule: "*/15 * * * *",
    input: { syncType: "INCREMENTAL", trigger: "SCHEDULE" },
  },
  dailyCleanup: {
    workflowType: "cleanupWorkflow",
    cronSchedule: "0 3 * * *",
    input: { type: "DAILY" },
  },
  analyticsExport: {
    workflowType: "analyticsExportWorkflow",
    cronSchedule: "0 3 * * *",
    timezone: "UTC",
  },
  emergenceDetection: {
    workflowType: "emergenceDetectionWorkflow",
    cronSchedule: "0 9 * * MON",
    timezone: "UTC",
  },
} as const satisfies Record<string, ScheduleConfig>;

export type TemporalScheduleId = keyof typeof TEMPORAL_SCHEDULES;
