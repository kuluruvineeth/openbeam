import type { Database } from "@openplane/db";
import { createAgentCanvasApproval } from "@openplane/db";
import type {
  CreateCanvasApprovalInput,
  CreateCanvasApprovalOutput,
} from "@openplane/types/temporal";
import { emitRuntimeEvent } from "./runtime-event-emitter";

export interface CanvasApprovalDependencies {
  db: Database;
}

export function createCanvasApprovalActivity(deps: CanvasApprovalDependencies) {
  return async function createCanvasApproval(
    input: CreateCanvasApprovalInput
  ): Promise<CreateCanvasApprovalOutput> {
    const expiresAt =
      input.timeoutMs && input.timeoutMs > 0
        ? new Date(Date.now() + input.timeoutMs)
        : undefined;

    const approval = await createAgentCanvasApproval(deps.db, {
      executionId: input.executionId,
      nodeId: input.nodeId,
      requestMessage: input.requestMessage,
      expiresAt,
    });

    if (input.sessionId && input.canvasId) {
      await emitRuntimeEvent(
        {
          db: deps.db,
          sessionId: input.sessionId,
          canvasId: input.canvasId,
          teamId: input.teamId ?? "",
          executionId: input.executionId,
          turnId: input.turnId,
        },
        {
          type: "execution.progress",
          executionId: input.executionId,
          nodeId: input.nodeId,
          message: `Approval requested: ${input.requestMessage ?? "Waiting for approval"}`,
        }
      );
    }

    return {
      approvalId: approval.id,
      expiresAt: approval.expiresAt?.getTime(),
    };
  };
}
