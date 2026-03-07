import type { Database } from "@openbeam/db";
import {
  createAgentCanvasExecutionStep,
  updateAgentCanvasExecutionStep,
} from "@openbeam/db";
import {
  CanvasNodeExecutionError,
  CanvasNodeExecutorNotFoundError,
  executeCanvasNode as executeCanvasNodeService,
} from "@openbeam/services/canvas";
import type {
  ExecuteCanvasNodeInput,
  ExecuteCanvasNodeOutput,
} from "@openbeam/types/temporal";
import { Context } from "@temporalio/activity";
import { ApplicationFailure } from "@temporalio/workflow";
import {
  createDbClaimCheckStore,
  isExecutionDataRef,
  resolvePayload,
  storePayload,
} from "../../engine/claim-check";

export interface ExecuteCanvasNodeDependencies {
  db: Database;
  maxInlineBytes?: number;
}

export function createExecuteCanvasNodeActivity(
  deps: ExecuteCanvasNodeDependencies
) {
  return async function executeCanvasNodeActivity(
    input: ExecuteCanvasNodeInput
  ): Promise<ExecuteCanvasNodeOutput> {
    const startedAt = Date.now();
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
      status: "RUNNING",
      input: storedInput,
      startedAt: new Date(startedAt),
    });

    try {
      Context.current().heartbeat({
        stage: "executing",
        nodeId: input.node.id,
      });

      const output = await executeCanvasNodeService({
        node: input.node,
        input: resolvedInput,
        context: input.context,
      });
      const storedOutput = await storePayload(
        output,
        claimCheck,
        { maxInlineBytes: deps.maxInlineBytes },
        { nodeId: input.node.id }
      );
      const completedAt = Date.now();
      const latencyMs = completedAt - startedAt;

      await updateAgentCanvasExecutionStep(deps.db, step.id, input.teamId, {
        status: "COMPLETED",
        output: storedOutput,
        latencyMs,
        completedAt: new Date(completedAt),
      });

      return {
        output: isExecutionDataRef(storedOutput) ? undefined : storedOutput,
        outputRef: isExecutionDataRef(storedOutput) ? storedOutput : undefined,
        inputRef: isExecutionDataRef(storedInput) ? storedInput : undefined,
        startedAt,
        completedAt,
        latencyMs,
      };
    } catch (error) {
      const completedAt = Date.now();
      const latencyMs = completedAt - startedAt;
      const message = error instanceof Error ? error.message : String(error);

      await updateAgentCanvasExecutionStep(deps.db, step.id, input.teamId, {
        status: "FAILED",
        error: message,
        latencyMs,
        completedAt: new Date(completedAt),
      });

      if (error instanceof CanvasNodeExecutorNotFoundError) {
        throw ApplicationFailure.nonRetryable(message, "UnsupportedNodeType");
      }

      if (error instanceof CanvasNodeExecutionError) {
        throw ApplicationFailure.nonRetryable(
          message,
          "CanvasNodeExecutionError"
        );
      }

      throw error;
    }
  };
}
