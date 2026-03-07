import type { Database } from "@openbeam/db";
import type { CanvasState } from "@openbeam/types/canvas";
import { ApplicationFailure } from "@temporalio/activity";

export interface LoadCanvasActivityInput {
  agentCanvasId: string;
  versionNumber: number;
  teamId: string;
}

export interface LoadCanvasActivityOutput {
  canvas: CanvasState;
}

export function createLoadCanvasActivity(deps: { db: Database }) {
  return async function loadCanvasActivity(
    input: LoadCanvasActivityInput
  ): Promise<LoadCanvasActivityOutput> {
    const version = await deps.db.agentCanvasVersion.findUnique({
      where: {
        agentCanvasId_version: {
          agentCanvasId: input.agentCanvasId,
          version: input.versionNumber,
        },
      },
      select: {
        nodes: true,
        edges: true,
        viewport: true,
        agentCanvasId: true,
      },
    });

    if (!version) {
      throw ApplicationFailure.nonRetryable(
        `Canvas version not found: ${input.agentCanvasId}@${input.versionNumber}`,
        "CanvasNotFoundError"
      );
    }

    const canvasRecord = await deps.db.agentCanvas.findUnique({
      where: { id: input.agentCanvasId },
      select: { teamId: true },
    });

    if (!canvasRecord || canvasRecord.teamId !== input.teamId) {
      throw ApplicationFailure.nonRetryable(
        "Unauthorized: Canvas does not belong to team",
        "AuthorizationError"
      );
    }

    const canvas: CanvasState = {
      nodes: version.nodes as CanvasState["nodes"],
      edges: version.edges as CanvasState["edges"],
      viewport: version.viewport as CanvasState["viewport"],
    };

    return { canvas };
  };
}
