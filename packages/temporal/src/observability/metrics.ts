import { getTemporalClient } from "../client";

export interface WorkflowMetrics {
  total: number;
  running: number;
  completed: number;
  failed: number;
  cancelled: number;
  terminated: number;
  timedOut: number;
}

export interface WorkflowTypeMetrics {
  workflowType: string;
  total: number;
  running: number;
  completed: number;
  failed: number;
  avgDurationMs: number;
}

export interface QueueMetrics {
  taskQueue: string;
  activeWorkers: number;
  pendingWorkflows: number;
  pendingActivities: number;
}

export async function getWorkflowMetrics(): Promise<WorkflowMetrics> {
  const client = await getTemporalClient();

  const statuses = [
    "Running",
    "Completed",
    "Failed",
    "Cancelled",
    "Terminated",
    "TimedOut",
  ];

  const counts: Record<string, number> = {};

  for (const status of statuses) {
    let count = 0;
    const workflows = client.workflow.list({
      query: `ExecutionStatus = "${status}"`,
    });

    for await (const _ of workflows) {
      count += 1;
      if (count >= 10_000) {
        break;
      }
    }

    counts[status] = count;
  }

  return {
    total: Object.values(counts).reduce((a, b) => a + b, 0),
    running: counts.Running ?? 0,
    completed: counts.Completed ?? 0,
    failed: counts.Failed ?? 0,
    cancelled: counts.Cancelled ?? 0,
    terminated: counts.Terminated ?? 0,
    timedOut: counts.TimedOut ?? 0,
  };
}

export async function getWorkflowTypeMetrics(
  workflowType: string
): Promise<WorkflowTypeMetrics> {
  const client = await getTemporalClient();

  const statuses = ["Running", "Completed", "Failed"];
  const counts: Record<string, number> = {};
  const durations: number[] = [];

  for (const status of statuses) {
    let count = 0;
    const workflows = client.workflow.list({
      query: `WorkflowType = "${workflowType}" AND ExecutionStatus = "${status}"`,
    });

    for await (const workflow of workflows) {
      count += 1;

      if (
        status === "Completed" &&
        workflow.startTime &&
        workflow.closeTime &&
        durations.length < 100
      ) {
        const duration =
          workflow.closeTime.getTime() - workflow.startTime.getTime();
        durations.push(duration);
      }

      if (count >= 10_000) {
        break;
      }
    }

    counts[status] = count;
  }

  const avgDurationMs =
    durations.length > 0
      ? durations.reduce((a, b) => a + b, 0) / durations.length
      : 0;

  return {
    workflowType,
    total: Object.values(counts).reduce((a, b) => a + b, 0),
    running: counts.Running ?? 0,
    completed: counts.Completed ?? 0,
    failed: counts.Failed ?? 0,
    avgDurationMs,
  };
}

export async function getRecentFailures(limit = 10): Promise<
  Array<{
    workflowId: string;
    workflowType: string;
    failedAt: Date;
    error?: string;
  }>
> {
  const client = await getTemporalClient();

  const workflows = client.workflow.list({
    query: 'ExecutionStatus = "Failed" ORDER BY CloseTime DESC',
  });

  const failures: Array<{
    workflowId: string;
    workflowType: string;
    failedAt: Date;
    error?: string;
  }> = [];

  for await (const workflow of workflows) {
    failures.push({
      workflowId: workflow.workflowId,
      workflowType: workflow.type,
      failedAt: workflow.closeTime ?? new Date(),
    });

    if (failures.length >= limit) {
      break;
    }
  }

  return failures;
}

export async function getRunningWorkflowsByType(): Promise<
  Map<string, number>
> {
  const client = await getTemporalClient();

  const workflows = client.workflow.list({
    query: 'ExecutionStatus = "Running"',
  });

  const counts = new Map<string, number>();

  for await (const workflow of workflows) {
    const current = counts.get(workflow.type) ?? 0;
    counts.set(workflow.type, current + 1);
  }

  return counts;
}
