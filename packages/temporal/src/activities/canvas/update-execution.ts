import type { Database } from "@openplane/db";
import { updateAgentCanvasExecution } from "@openplane/db";
import type { UpdateCanvasExecutionInput } from "@openplane/types/temporal";

export interface UpdateCanvasExecutionDependencies {
  db: Database;
}

export function createUpdateCanvasExecutionActivity(
  deps: UpdateCanvasExecutionDependencies
) {
  return async function updateCanvasExecution(
    input: UpdateCanvasExecutionInput
  ): Promise<void> {
    await updateAgentCanvasExecution(deps.db, input.executionId, input.teamId, {
      status: input.status,
      currentNodeId: input.currentNodeId,
      output: input.output,
      error: input.error,
      trace: input.trace,
      tokenUsage: input.tokenUsage,
      latencyMs: input.latencyMs,
      startedAt:
        input.startedAt !== undefined ? new Date(input.startedAt) : undefined,
      completedAt:
        input.completedAt !== undefined
          ? new Date(input.completedAt)
          : undefined,
      workflowId: input.workflowId,
      runId: input.runId,
      temporalStatus: input.temporalStatus,
      historyEventCount: input.historyEventCount,
      historySizeBytes: input.historySizeBytes,
      continueAsNewCount: input.continueAsNewCount,
    });
  };
}
