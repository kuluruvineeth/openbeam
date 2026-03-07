import type { Database } from "@openbeam/db";
import {
  createAgentCanvasExecutionStep,
  updateAgentCanvasExecutionStep,
} from "@openbeam/db";
import type {
  CreateCanvasExecutionStepInput,
  CreateCanvasExecutionStepOutput,
  UpdateCanvasExecutionStepInput,
  UpdateCanvasExecutionStepOutput,
} from "@openbeam/types/temporal";
import {
  createDbClaimCheckStore,
  isExecutionDataRef,
  resolvePayload,
  storePayload,
} from "../../engine/claim-check";
import { emitRuntimeEvent } from "./runtime-event-emitter";

export interface CanvasExecutionStepDependencies {
  db: Database;
  maxInlineBytes?: number;
}

export function createCreateCanvasExecutionStepActivity(
  deps: CanvasExecutionStepDependencies
) {
  return async function createCanvasExecutionStep(
    input: CreateCanvasExecutionStepInput
  ): Promise<CreateCanvasExecutionStepOutput> {
    const claimCheck = createDbClaimCheckStore(
      deps.db,
      input.executionId,
      input.teamId
    );
    const resolvedInput = isExecutionDataRef(input.input)
      ? await resolvePayload(input.input, claimCheck)
      : input.input;
    const storedInput = isExecutionDataRef(input.input)
      ? input.input
      : await storePayload(
          resolvedInput,
          claimCheck,
          { maxInlineBytes: deps.maxInlineBytes },
          { nodeId: input.node.id }
        );

    const step = await createAgentCanvasExecutionStep(deps.db, input.teamId, {
      executionId: input.executionId,
      nodeId: input.node.id,
      nodeType: input.node.type,
      status: input.status,
      input: storedInput,
      startedAt:
        input.startedAt !== undefined ? new Date(input.startedAt) : undefined,
    });

    if (input.sessionId && input.canvasId) {
      await emitRuntimeEvent(
        {
          db: deps.db,
          sessionId: input.sessionId,
          canvasId: input.canvasId,
          teamId: input.teamId,
          executionId: input.executionId,
          turnId: input.turnId,
          stepId: step.id,
        },
        {
          type: "execution.progress",
          executionId: input.executionId,
          nodeId: input.node.id,
          message: `Started ${input.node.type}`,
        }
      );
    }

    return {
      stepId: step.id,
      inputRef: isExecutionDataRef(storedInput) ? storedInput : undefined,
    };
  };
}

export function createUpdateCanvasExecutionStepActivity(
  deps: CanvasExecutionStepDependencies
) {
  return async function updateCanvasExecutionStep(
    input: UpdateCanvasExecutionStepInput
  ): Promise<UpdateCanvasExecutionStepOutput> {
    const claimCheck = createDbClaimCheckStore(
      deps.db,
      input.executionId,
      input.teamId
    );
    let storedOutput: unknown = input.output;

    if (input.output !== undefined && !isExecutionDataRef(input.output)) {
      storedOutput = await storePayload(
        input.output,
        claimCheck,
        { maxInlineBytes: deps.maxInlineBytes },
        { nodeId: input.nodeId }
      );
    }

    await updateAgentCanvasExecutionStep(deps.db, input.stepId, input.teamId, {
      status: input.status,
      output: storedOutput !== undefined ? storedOutput : undefined,
      error: input.error,
      latencyMs: input.latencyMs,
      completedAt:
        input.completedAt !== undefined
          ? new Date(input.completedAt)
          : undefined,
    });

    if (
      input.sessionId &&
      input.canvasId &&
      (input.status === "COMPLETED" || input.status === "FAILED")
    ) {
      await emitRuntimeEvent(
        {
          db: deps.db,
          sessionId: input.sessionId,
          canvasId: input.canvasId,
          teamId: input.teamId,
          executionId: input.executionId,
          turnId: input.turnId,
          stepId: input.stepId,
        },
        {
          type: "execution.progress",
          executionId: input.executionId,
          nodeId: input.nodeId,
          message:
            input.status === "COMPLETED"
              ? `Completed ${input.nodeId}`
              : `Failed ${input.nodeId}: ${input.error ?? "Unknown"}`,
        }
      );
    }

    return {
      output: isExecutionDataRef(storedOutput) ? undefined : storedOutput,
      outputRef: isExecutionDataRef(storedOutput) ? storedOutput : undefined,
    };
  };
}
