import type { Database } from "@openbeam/db";
import { ApplicationFailure } from "@temporalio/common";

export interface CleanupDependencies {
  db: Database;
}

export interface CleanupExecutionDataInput {
  olderThanDays: number;
  teamId?: string;
}

export interface CleanupExecutionDataOutput {
  deletedPayloads: number;
  processedExecutions: number;
}

export function createCleanupExecutionDataActivity(deps: CleanupDependencies) {
  return async function cleanupExecutionData(
    input: CleanupExecutionDataInput
  ): Promise<CleanupExecutionDataOutput> {
    if (input.olderThanDays < 1) {
      throw ApplicationFailure.nonRetryable(
        "olderThanDays must be at least 1",
        "INVALID_INPUT"
      );
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - input.olderThanDays);

    const whereClause: Record<string, unknown> = {
      status: { in: ["COMPLETED", "FAILED", "CANCELLED", "TIMED_OUT"] },
      createdAt: { lt: cutoffDate },
    };

    if (input.teamId) {
      whereClause.agentCanvas = { teamId: input.teamId };
    }

    const executions = await deps.db.agentCanvasExecution.findMany({
      where: whereClause,
      select: { id: true },
      take: 1000,
    });

    if (executions.length === 0) {
      return { deletedPayloads: 0, processedExecutions: 0 };
    }

    const executionIds = executions.map((e) => e.id);

    const deleteResult = await deps.db.agentCanvasExecutionData.deleteMany({
      where: { executionId: { in: executionIds } },
    });

    return {
      deletedPayloads: deleteResult.count,
      processedExecutions: executions.length,
    };
  };
}
