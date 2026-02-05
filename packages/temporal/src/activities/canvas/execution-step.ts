import type { Database } from "@openplane/db";
import {
  createAgentCanvasExecutionStep,
  updateAgentCanvasExecutionStep,
} from "@openplane/db";
import type {
  CreateCanvasExecutionStepInput,
  CreateCanvasExecutionStepOutput,
  UpdateCanvasExecutionStepInput,
  UpdateCanvasExecutionStepOutput,
} from "@openplane/types/temporal";
import {
  createDbClaimCheckStore,
  isExecutionDataRef,
  resolvePayload,
  storePayload,
} from "../../engine/claim-check";

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
      output: storedOutput !== undefined ? (storedOutput as never) : undefined,
      error: input.error,
      latencyMs: input.latencyMs,
      completedAt:
        input.completedAt !== undefined
          ? new Date(input.completedAt)
          : undefined,
    });

    return {
      output: isExecutionDataRef(storedOutput) ? undefined : storedOutput,
      outputRef: isExecutionDataRef(storedOutput) ? storedOutput : undefined,
    };
  };
}
