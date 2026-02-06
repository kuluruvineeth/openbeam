import type { Database } from "@openplane/db";
import { logger } from "@openplane/services/lib/logger";
import { ApplicationFailure } from "@temporalio/common";

export async function verifyExecutionOwnership(
  executionId: string,
  teamId: string,
  db: Database
): Promise<void> {
  const execution = await db.agentCanvasExecution.findFirst({
    where: { id: executionId },
    select: {
      agentCanvas: {
        select: { teamId: true },
      },
    },
  });

  if (!execution) {
    logger.warn(
      { executionId, teamId },
      "Execution not found during auth check"
    );
    throw ApplicationFailure.nonRetryable("Execution not found", "NOT_FOUND");
  }

  if (execution.agentCanvas.teamId !== teamId) {
    logger.warn(
      { executionId, teamId, actualTeamId: execution.agentCanvas.teamId },
      "Unauthorized execution access attempt"
    );
    throw ApplicationFailure.nonRetryable(
      "Unauthorized: Execution does not belong to team",
      "UNAUTHORIZED"
    );
  }
}

export async function verifyExecutionStepOwnership(
  stepId: string,
  teamId: string,
  db: Database
): Promise<void> {
  const step = await db.agentCanvasExecutionStep.findFirst({
    where: { id: stepId },
    select: {
      execution: {
        select: {
          agentCanvas: {
            select: { teamId: true },
          },
        },
      },
    },
  });

  if (!step) {
    logger.warn(
      { stepId, teamId },
      "Execution step not found during auth check"
    );
    throw ApplicationFailure.nonRetryable(
      "Execution step not found",
      "NOT_FOUND"
    );
  }

  if (step.execution.agentCanvas.teamId !== teamId) {
    logger.warn(
      { stepId, teamId, actualTeamId: step.execution.agentCanvas.teamId },
      "Unauthorized execution step access attempt"
    );
    throw ApplicationFailure.nonRetryable(
      "Unauthorized: Execution step does not belong to team",
      "UNAUTHORIZED"
    );
  }
}

export async function verifyCanvasOwnership(
  canvasId: string,
  teamId: string,
  db: Database
): Promise<void> {
  const canvas = await db.agentCanvas.findFirst({
    where: { id: canvasId },
    select: { teamId: true },
  });

  if (!canvas) {
    logger.warn({ canvasId, teamId }, "Canvas not found during auth check");
    throw ApplicationFailure.nonRetryable("Canvas not found", "NOT_FOUND");
  }

  if (canvas.teamId !== teamId) {
    logger.warn(
      { canvasId, teamId, actualTeamId: canvas.teamId },
      "Unauthorized canvas access attempt"
    );
    throw ApplicationFailure.nonRetryable(
      "Unauthorized: Canvas does not belong to team",
      "UNAUTHORIZED"
    );
  }
}
