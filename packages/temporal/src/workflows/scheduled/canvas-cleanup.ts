import { proxyActivities } from "@temporalio/workflow";

export interface CanvasCleanupInput {
  executionDataRetentionDays: number;
  teamId?: string;
}

export interface CanvasCleanupOutput {
  deletedPayloads: number;
  processedExecutions: number;
}

interface CanvasCleanupActivities {
  cleanupExecutionData(input: {
    olderThanDays: number;
    teamId?: string;
  }): Promise<{ deletedPayloads: number; processedExecutions: number }>;
}

const activities = proxyActivities<CanvasCleanupActivities>({
  startToCloseTimeout: "10m",
  scheduleToCloseTimeout: "30m",
  heartbeatTimeout: "2m",
  retry: {
    maximumAttempts: 3,
    initialInterval: "10s",
    backoffCoefficient: 2,
  },
});

export async function canvasCleanupWorkflow(
  input: CanvasCleanupInput
): Promise<CanvasCleanupOutput> {
  const result = await activities.cleanupExecutionData({
    olderThanDays: input.executionDataRetentionDays,
    teamId: input.teamId,
  });

  return {
    deletedPayloads: result.deletedPayloads,
    processedExecutions: result.processedExecutions,
  };
}
