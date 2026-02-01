import { Connection, ScheduleClient } from "@temporalio/client";
import { TASK_QUEUES } from "../config";
import type {
  AnalyticsExportInput,
  CleanupInput,
  EmergenceDetectionInput,
  LtrTrainingInput,
  ReembedInput,
} from "../workflows/types";

export interface ScheduleConfig {
  id: string;
  workflowType: string;
  taskQueue: string;
  args: unknown[];
  cronExpression: string;
  overlap?: "skip" | "buffer" | "cancel";
  memo?: Record<string, unknown>;
}

const DEFAULT_SCHEDULES: ScheduleConfig[] = [
  {
    id: "daily-cleanup",
    workflowType: "cleanupWorkflow",
    taskQueue: TASK_QUEUES.SCHEDULED,
    args: [{ type: "DAILY" } satisfies CleanupInput],
    cronExpression: "0 2 * * *",
    overlap: "skip",
    memo: { description: "Daily cleanup of stale and orphaned documents" },
  },
  {
    id: "weekly-emergence-detection",
    workflowType: "emergenceDetectionWorkflow",
    taskQueue: TASK_QUEUES.SCHEDULED,
    args: [
      {
        analysisType: "weekly",
        minFrequency: 10,
        minSuccessRate: 0.7,
      } satisfies EmergenceDetectionInput,
    ],
    cronExpression: "0 3 * * 0",
    overlap: "skip",
    memo: {
      description:
        "Weekly analysis of agent composition patterns for formalization",
    },
  },
  {
    id: "daily-reembed",
    workflowType: "reembedWorkflow",
    taskQueue: TASK_QUEUES.SCHEDULED,
    args: [{ connectorId: "", batchSize: 100 } satisfies ReembedInput],
    cronExpression: "0 4 * * *",
    overlap: "skip",
    memo: {
      description: "Daily scan for documents needing embedding updates",
    },
  },
  {
    id: "weekly-ltr-training",
    workflowType: "ltrTrainingWorkflow",
    taskQueue: TASK_QUEUES.SCHEDULED,
    args: [
      {
        teamId: "",
        minSamples: 100,
      } satisfies LtrTrainingInput,
    ],
    cronExpression: "0 5 * * 1",
    overlap: "skip",
    memo: {
      description: "Weekly learning-to-rank model training for search ranking",
    },
  },
  {
    id: "daily-analytics-export",
    workflowType: "analyticsExportWorkflow",
    taskQueue: TASK_QUEUES.SCHEDULED,
    args: [
      {
        teamId: "",
        exportType: "daily",
        startDate: 0,
        endDate: 0,
      } satisfies AnalyticsExportInput,
    ],
    cronExpression: "0 1 * * *",
    overlap: "skip",
    memo: {
      description: "Daily export of analytics data to parquet format",
    },
  },
];

export async function registerSchedules(
  schedules: ScheduleConfig[] = DEFAULT_SCHEDULES,
  options: {
    temporalAddress?: string;
    namespace?: string;
  } = {}
): Promise<void> {
  const {
    temporalAddress = process.env.TEMPORAL_ADDRESS ?? "localhost:7233",
    namespace = process.env.TEMPORAL_NAMESPACE ?? "default",
  } = options;

  const connection = await Connection.connect({ address: temporalAddress });
  const client = new ScheduleClient({ connection, namespace });

  for (const schedule of schedules) {
    try {
      const existingSchedule = await client
        .getHandle(schedule.id)
        .describe()
        .catch(() => null);

      if (existingSchedule) {
        await client.getHandle(schedule.id).update((prev) => ({
          ...prev,
          spec: { cronExpressions: [schedule.cronExpression] },
          action: {
            type: "startWorkflow",
            workflowType: schedule.workflowType,
            taskQueue: schedule.taskQueue,
            args: schedule.args,
          },
        }));
      } else {
        await client.create({
          scheduleId: schedule.id,
          spec: { cronExpressions: [schedule.cronExpression] },
          action: {
            type: "startWorkflow",
            workflowType: schedule.workflowType,
            taskQueue: schedule.taskQueue,
            args: schedule.args,
          },
          policies: {
            overlap: schedule.overlap === "skip" ? "SKIP" : "BUFFER_ONE",
          },
          state: { paused: false },
        });
      }
    } catch (error) {
      throw new Error(
        `Failed to register schedule ${schedule.id}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  await connection.close();
}

export async function listSchedules(
  options: { temporalAddress?: string; namespace?: string } = {}
): Promise<ScheduleConfig[]> {
  const {
    temporalAddress = process.env.TEMPORAL_ADDRESS ?? "localhost:7233",
    namespace = process.env.TEMPORAL_NAMESPACE ?? "default",
  } = options;

  const connection = await Connection.connect({ address: temporalAddress });
  const client = new ScheduleClient({ connection, namespace });

  const schedules: ScheduleConfig[] = [];

  for await (const schedule of client.list()) {
    const description = await client.getHandle(schedule.scheduleId).describe();
    const action = description.action;

    if (action.type === "startWorkflow") {
      const spec = description.spec as {
        calendars?: Array<{ cronExpressions?: string[] }>;
      };
      const cronExpr = spec.calendars?.[0]?.cronExpressions?.[0] ?? "";

      schedules.push({
        id: schedule.scheduleId,
        workflowType: action.workflowType,
        taskQueue: action.taskQueue,
        args: [...(action.args ?? [])],
        cronExpression: cronExpr,
      });
    }
  }

  await connection.close();

  return schedules;
}

export async function deleteSchedule(
  scheduleId: string,
  options: {
    temporalAddress?: string;
    namespace?: string;
  } = {}
): Promise<void> {
  const {
    temporalAddress = process.env.TEMPORAL_ADDRESS ?? "localhost:7233",
    namespace = process.env.TEMPORAL_NAMESPACE ?? "default",
  } = options;

  const connection = await Connection.connect({ address: temporalAddress });
  const client = new ScheduleClient({ connection, namespace });

  await client.getHandle(scheduleId).delete();
  await connection.close();
}
