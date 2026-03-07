import type { Database } from "@openbeam/db";
import { updateAgentCanvasExecution } from "@openbeam/db";
import type { UpdateCanvasExecutionInput } from "@openbeam/types/temporal";
import { emitRuntimeEvent } from "./runtime-event-emitter";

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

    if (!(input.sessionId && input.canvasId && input.status)) {
      return;
    }

    const ctx = {
      db: deps.db,
      sessionId: input.sessionId,
      canvasId: input.canvasId,
      teamId: input.teamId,
      executionId: input.executionId,
      turnId: input.turnId,
    };

    switch (input.status) {
      case "RUNNING":
        await emitRuntimeEvent(ctx, {
          type: "execution.started",
          executionId: input.executionId,
          status: "RUNNING",
        });
        break;

      case "COMPLETED":
        await emitRuntimeEvent(ctx, {
          type: "execution.completed",
          executionId: input.executionId,
          status: "COMPLETED",
          durationMs: input.latencyMs,
        });
        break;

      case "FAILED":
        await emitRuntimeEvent(ctx, {
          type: "execution.failed",
          executionId: input.executionId,
          error: input.error ?? "Unknown error",
        });
        break;

      case "CANCELLED":
        await emitRuntimeEvent(ctx, {
          type: "execution.failed",
          executionId: input.executionId,
          error: "Execution cancelled",
        });
        break;

      default:
        break;
    }
  };
}
