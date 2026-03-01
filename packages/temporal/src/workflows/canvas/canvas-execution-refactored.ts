import type {
  CanvasState,
  ExecutionPlan,
  ExecutionTrace,
} from "@openplane/types/canvas";
import {
  type AgentCanvasExecutionInput,
  AgentCanvasExecutionInputSchema,
  type AgentCanvasExecutionOutput,
} from "@openplane/types/temporal/workflows";
import {
  ApplicationFailure,
  continueAsNew,
  patched,
  proxyActivities,
  workflowInfo,
} from "@temporalio/workflow";
import type { AuditActivities } from "../../activities/canvas/audit-activity";
import type { LoadCanvasActivityInput } from "../../activities/canvas/load-canvas";
import type { CanvasExecutionActivities } from "../../activities/canvas/types";
import { compileCanvasPlan } from "../../engine/canvas-compiler";
import { currentTimestamp } from "../temporal-utils";
import { type ExecutePlanParams, executePlanNodes } from "./executor";
import { setupQueryHandlers, setupSignalHandlers } from "./signals";
import { createCheckpoint, restoreFromCheckpoint } from "./state";
import { createInitialTrace } from "./trace/builder";
import { formatPlanError } from "./utils/errors";
import { getWorkflowMetadata } from "./utils/execution";
import { enforceWorkflowRateLimit } from "./utils/rate-limit";
import {
  resolveParallelMapPlan,
  resolveParallelSplitPlan,
} from "./utils/resolution";
import { enforceExecutionPlan, ensureSupportedNodes } from "./utils/validators";

const HISTORY_LENGTH_THRESHOLD = 10_000;

function getTimestamp(): number {
  return currentTimestamp();
}

function shouldContinueAsNew(): boolean {
  const info = workflowInfo();
  return (
    info.continueAsNewSuggested || info.historyLength > HISTORY_LENGTH_THRESHOLD
  );
}

const updateActivities = proxyActivities<
  Pick<CanvasExecutionActivities, "updateCanvasExecution">
>({
  startToCloseTimeout: "30s",
  scheduleToCloseTimeout: "3m",
  retry: {
    maximumAttempts: 5,
    initialInterval: "1s",
    backoffCoefficient: 2,
    maximumInterval: "30s",
    nonRetryableErrorTypes: [
      "AuthorizationError",
      "CanvasNotFoundError",
      "ExecutionNotFoundError",
      "InvalidInputError",
    ],
  },
});

const auditActivities = proxyActivities<AuditActivities>({
  startToCloseTimeout: "10s",
  scheduleToCloseTimeout: "30s",
  retry: {
    maximumAttempts: 3,
    initialInterval: "1s",
    backoffCoefficient: 2,
    maximumInterval: "10s",
    nonRetryableErrorTypes: ["AuthorizationError", "InvalidInputError"],
  },
});

const loadCanvasActivities = proxyActivities<{
  loadCanvas(input: LoadCanvasActivityInput): Promise<{ canvas: CanvasState }>;
}>({
  startToCloseTimeout: "30s",
  scheduleToCloseTimeout: "1m",
  retry: {
    maximumAttempts: 3,
    initialInterval: "1s",
    backoffCoefficient: 2,
    maximumInterval: "10s",
    nonRetryableErrorTypes: [
      "AuthorizationError",
      "CanvasNotFoundError",
      "InvalidInputError",
    ],
  },
});

async function compilePlanOrThrow(
  input: AgentCanvasExecutionInput,
  canvas: CanvasState,
  startedAt: number
): Promise<ExecutionPlan> {
  try {
    const plan = compileCanvasPlan(canvas);
    ensureSupportedNodes(plan);
    enforceExecutionPlan(plan, {
      validateParallelSplitPlan: (node, ctx) => {
        resolveParallelSplitPlan({
          splitNode: node,
          nodesById: ctx.nodesById,
          edgesBySource: ctx.edgesBySource,
          edgesByTarget: ctx.edgesByTarget,
        });
      },
      validateParallelMapPlan: (node, ctx) => {
        resolveParallelMapPlan({
          mapNode: node,
          nodesById: ctx.nodesById,
          edgesBySource: ctx.edgesBySource,
        });
      },
    });
    return plan;
  } catch (error) {
    const completedAt = getTimestamp();
    const message = formatPlanError(error);
    const info = workflowInfo();

    const trace = createInitialTrace(input, startedAt);
    trace.status = "FAILED";
    trace.error = message;
    trace.completedAt = completedAt;
    trace.totalLatencyMs = completedAt - startedAt;

    await Promise.all([
      updateActivities.updateCanvasExecution({
        executionId: input.executionId,
        teamId: input.teamId,
        status: "FAILED",
        error: message,
        trace,
        startedAt,
        completedAt,
        ...getWorkflowMetadata("FAILED"),
      }),
      auditActivities.logAuditEvent({
        workflowId: info.workflowId,
        runId: info.runId,
        teamId: input.teamId,
        userId: input.triggeredById,
        action: "failed",
        metadata: {
          executionId: input.executionId,
          error: message,
          errorType: "CanvasValidationError",
          latencyMs: completedAt - startedAt,
        },
      }),
    ]);

    throw ApplicationFailure.nonRetryable(message, "CanvasValidationError");
  }
}

async function initializeExecution(params: {
  input: AgentCanvasExecutionInput;
  plan: ExecutionPlan;
  trace: ExecutionTrace;
  startedAt: number;
  isResumingFromCheckpoint: boolean;
}): Promise<void> {
  if (params.isResumingFromCheckpoint) {
    return;
  }

  const info = workflowInfo();

  await Promise.all([
    updateActivities.updateCanvasExecution({
      executionId: params.input.executionId,
      teamId: params.input.teamId,
      status: "RUNNING",
      currentNodeId: params.plan.startNodeId,
      trace: params.trace,
      startedAt: params.startedAt,
      ...getWorkflowMetadata("RUNNING"),
    }),
    auditActivities.logAuditEvent({
      workflowId: info.workflowId,
      runId: info.runId,
      teamId: params.input.teamId,
      userId: params.input.triggeredById,
      action: "started",
      metadata: {
        executionId: params.input.executionId,
        agentCanvasId: params.input.agentCanvasId,
        nodeCount: params.plan.nodes.length,
      },
    }),
  ]);
}

async function finalizeExecution(params: {
  input: AgentCanvasExecutionInput;
  trace: ExecutionTrace;
  startedAt: number;
  output: unknown;
  cancelled: boolean;
}): Promise<AgentCanvasExecutionOutput> {
  const { input, trace, startedAt, output, cancelled } = params;
  const completedAt = getTimestamp();
  const info = workflowInfo();

  if (cancelled) {
    trace.status = "CANCELLED";
    trace.completedAt = completedAt;
    trace.totalLatencyMs = completedAt - startedAt;

    await Promise.all([
      updateActivities.updateCanvasExecution({
        executionId: input.executionId,
        teamId: input.teamId,
        status: "CANCELLED",
        currentNodeId: trace.currentNodeId ?? null,
        trace,
        latencyMs: trace.totalLatencyMs,
        startedAt,
        completedAt,
        ...getWorkflowMetadata("CANCELLED"),
      }),
      auditActivities.logAuditEvent({
        workflowId: info.workflowId,
        runId: info.runId,
        teamId: input.teamId,
        userId: input.triggeredById,
        action: "cancelled",
        metadata: {
          executionId: input.executionId,
          latencyMs: trace.totalLatencyMs,
          stepsCompleted: trace.steps.filter((s) => s.status === "COMPLETED")
            .length,
        },
      }),
    ]);

    return {
      executionId: input.executionId,
      status: "CANCELLED",
      output: undefined,
    };
  }

  trace.status = "COMPLETED";
  trace.completedAt = completedAt;
  trace.totalLatencyMs = completedAt - startedAt;

  await Promise.all([
    updateActivities.updateCanvasExecution({
      executionId: input.executionId,
      teamId: input.teamId,
      status: "COMPLETED",
      currentNodeId: trace.currentNodeId ?? null,
      output,
      trace,
      latencyMs: trace.totalLatencyMs,
      startedAt,
      completedAt,
      ...getWorkflowMetadata("COMPLETED"),
    }),
    auditActivities.logAuditEvent({
      workflowId: info.workflowId,
      runId: info.runId,
      teamId: input.teamId,
      userId: input.triggeredById,
      action: "completed",
      metadata: {
        executionId: input.executionId,
        latencyMs: trace.totalLatencyMs,
        stepsCompleted: trace.steps.length,
      },
    }),
  ]);

  return {
    executionId: input.executionId,
    status: "COMPLETED",
    output,
  };
}

export async function agentCanvasExecutionWorkflow(
  rawInput: unknown
): Promise<AgentCanvasExecutionOutput> {
  const input = AgentCanvasExecutionInputSchema.parse(rawInput);
  const startedAt = getTimestamp();
  const state = { paused: false, cancelled: false };
  const approvalResponses = new Map();
  const inputResponses = new Map();

  const continueAsNewCount = input.checkpoint?.continueAsNewCount ?? 0;
  const isResumingFromCheckpoint = !!input.checkpoint;

  let restoredLoopStates: Map<string, unknown> | undefined;
  let restoredLoopStack: string[] | undefined;

  if (isResumingFromCheckpoint && input.checkpoint) {
    const restored = restoreFromCheckpoint(
      input.checkpoint,
      approvalResponses,
      inputResponses
    );
    restoredLoopStates = restored.loopStates;
    restoredLoopStack = restored.loopStack;
  }

  if (patched("v4-rate-limit-enforcement") && !isResumingFromCheckpoint) {
    await enforceWorkflowRateLimit({
      teamId: input.teamId,
      limitKey: "canvas-execution",
      limit: 100,
      windowMs: 60 * 60 * 1000,
    });
  }

  const metrics = { droppedSignals: 0, nodeExecutionCount: 0 };

  setupSignalHandlers({
    state,
    executionId: input.executionId,
    approvalResponses,
    inputResponses,
    metrics,
  });

  const { canvas } = await loadCanvasActivities.loadCanvas({
    agentCanvasId: input.agentCanvasId,
    versionNumber: input.versionNumber,
    teamId: input.teamId,
  });

  const plan = await compilePlanOrThrow(input, canvas, startedAt);
  const trace = createInitialTrace(input, startedAt);

  setupQueryHandlers({
    executionId: input.executionId,
    trace,
    plan,
    state,
    metrics,
    continueAsNewCount,
  });

  await initializeExecution({
    input,
    plan,
    trace,
    startedAt,
    isResumingFromCheckpoint,
  });

  const executeParams: ExecutePlanParams = {
    input,
    plan,
    trace,
    state,
    approvalResponses,
    inputResponses,
    startedAt,
    agentCanvasExecutionWorkflow,
    shouldContinueAsNew,
    initialLoopStates: restoredLoopStates as
      | Map<string, import("@openplane/types/temporal").LoopState>
      | undefined,
    initialLoopStack: restoredLoopStack,
    resumeFromNodeId: isResumingFromCheckpoint
      ? input.checkpoint?.currentNodeId
      : undefined,
    resumePayload: isResumingFromCheckpoint
      ? input.checkpoint?.currentPayload
      : undefined,
    resumeLastStepOutput: isResumingFromCheckpoint
      ? input.checkpoint?.lastStepOutput
      : undefined,
  };

  if (patched("v3-continue-as-new-support")) {
    const executionResult = await executePlanNodes(executeParams);

    if (
      shouldContinueAsNew() &&
      !executionResult.cancelled &&
      !state.cancelled
    ) {
      const checkpoint = createCheckpoint({
        trace,
        approvalResponses,
        inputResponses,
        loopStates: executionResult.loopStates,
        loopStack: executionResult.loopStack,
        continueAsNewCount,
        currentPayload: executionResult.currentPayload,
        lastStepOutput: executionResult.lastStepOutput,
        nextNodeId: executionResult.nextNodeId,
      });

      return continueAsNew<typeof agentCanvasExecutionWorkflow>({
        ...input,
        checkpoint,
      });
    }

    return await finalizeExecution({
      input,
      trace,
      startedAt,
      output: executionResult.output,
      cancelled: executionResult.cancelled,
    });
  }

  if (patched("v2-execution-with-enhanced-tracing")) {
    const executionResult = await executePlanNodes(executeParams);

    return await finalizeExecution({
      input,
      trace,
      startedAt,
      output: executionResult.output,
      cancelled: executionResult.cancelled,
    });
  }

  const { output, cancelled } = await executePlanNodes(executeParams);

  return await finalizeExecution({
    input,
    trace,
    startedAt,
    output,
    cancelled,
  });
}
