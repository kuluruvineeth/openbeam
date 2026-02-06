import {
  type ExecutionPlanNode,
  type ExecutionTrace,
  ParallelJoinNodeConfigSchema,
  ParallelSplitNodeConfigSchema,
} from "@openplane/types/canvas";
import type {
  LoopState,
  ParallelJoinBranchResult,
} from "@openplane/types/temporal";
import { ApplicationFailure } from "@temporalio/workflow";

import { isExecutionDataRef } from "../../../engine/claim-check-utils";
import {
  buildCompletedStep,
  updateTraceForInput,
  updateTraceForOutput,
} from "../trace";
import { executeActivities, updateActivities } from "../utils/activity-proxies";
import {
  getWorkflowMetadata,
  runTasksWithConcurrency,
} from "../utils/execution";
import type { ExecutionGraph } from "../utils/graph";
import type { ParallelSplitPlan } from "../utils/resolution";
import { resolveNextEdge } from "../utils/resolution";
import { resolveNodeConfig } from "../utils/type-guards";

export interface ParallelSplitHandlerParams {
  node: ExecutionPlanNode;
  currentPayload: unknown;
  lastStepOutput: unknown;
  trace: ExecutionTrace;
  startedAt: number;
  executionId: string;
  teamId: string;
  splitPlan: ParallelSplitPlan;
  graph: ExecutionGraph;
  runExecution: (params: {
    startNodeId: string | null;
    input: unknown;
    stopNodeIds?: Set<string>;
    loopStates: Map<string, LoopState>;
    loopStack: string[];
  }) => Promise<{
    output: unknown;
    cancelled: boolean;
    stoppedAt?: string | null;
  }>;
  cancelled: boolean;
}

export interface ParallelSplitResult {
  nextNodeId: string | null;
  output: unknown;
  cancelled: boolean;
}

function getTimestamp(): number {
  return Date.now();
}

export async function handleParallelSplitNode(
  params: ParallelSplitHandlerParams
): Promise<ParallelSplitResult> {
  const {
    node,
    currentPayload,
    lastStepOutput,
    trace,
    startedAt,
    executionId,
    teamId,
    splitPlan,
    graph,
    runExecution: runBranchExecution,
    cancelled,
  } = params;

  const splitResult = await executeActivities.executeParallelSplitNode({
    executionId,
    teamId,
    node,
    input: currentPayload,
  });

  const splitStep = buildCompletedStep(node, currentPayload, splitResult);
  trace.steps.push(splitStep);
  updateTraceForInput(trace, splitStep);
  updateTraceForOutput(trace, splitStep);
  trace.status = "RUNNING";
  trace.totalLatencyMs = splitResult.completedAt - startedAt;

  await updateActivities.updateCanvasExecution({
    executionId,
    teamId,
    status: "RUNNING",
    currentNodeId: node.id,
    trace,
    latencyMs: trace.totalLatencyMs,
    ...getWorkflowMetadata("RUNNING"),
  });

  const splitConfig = ParallelSplitNodeConfigSchema.parse(
    resolveNodeConfig(node.data)
  );

  const branchInputMap = new Map<string, unknown>();
  for (const branch of splitResult.output.branches) {
    branchInputMap.set(branch.branchId, branch.inputRef ?? branch.input);
  }

  const branchExecutions = splitPlan.branches.map((branch) => {
    const inputValue = branchInputMap.get(branch.branchId);
    if (inputValue === undefined) {
      throw new Error(
        `Parallel split node ${node.id} missing input for ${branch.branchId}`
      );
    }
    return { ...branch, input: inputValue };
  });

  const branchTasks = branchExecutions.map((branch) => async () => {
    const branchLoopStates = new Map<string, LoopState>();
    const branchLoopStack: string[] = [];
    const result = await runBranchExecution({
      startNodeId: branch.startNodeId,
      input: branch.input,
      stopNodeIds: new Set([splitPlan.joinNodeId]),
      loopStates: branchLoopStates,
      loopStack: branchLoopStack,
    });
    return { branch, result };
  });

  const maxConcurrency =
    splitConfig.executionMode === "parallel"
      ? Math.max(1, splitConfig.maxConcurrency ?? branchTasks.length)
      : 1;

  const branchStartAt = getTimestamp();
  const taskResults = await runTasksWithConcurrency({
    tasks: branchTasks,
    maxConcurrency,
    stopOnError: splitConfig.errorHandling === "failFast",
  });

  const branchElapsedMs = getTimestamp() - branchStartAt;
  if (
    splitConfig.timeoutMs !== undefined &&
    branchElapsedMs > splitConfig.timeoutMs
  ) {
    throw ApplicationFailure.nonRetryable(
      `Parallel split node ${node.id} timed out`,
      "CanvasExecutionTimeout"
    );
  }

  const firstFailure = taskResults.find(
    (taskResult): taskResult is { status: "rejected"; reason: unknown } =>
      taskResult.status === "rejected"
  );

  if (splitConfig.errorHandling === "failFast" && firstFailure) {
    throw firstFailure.reason;
  }

  if (cancelled) {
    return {
      nextNodeId: null,
      output: lastStepOutput,
      cancelled: true,
    };
  }

  const joinNode = graph.nodesById.get(splitPlan.joinNodeId);
  if (!joinNode) {
    throw ApplicationFailure.nonRetryable(
      `Parallel join ${splitPlan.joinNodeId} not found`,
      "CanvasExecutionPlanError"
    );
  }

  const joinConfig = ParallelJoinNodeConfigSchema.parse(
    resolveNodeConfig(joinNode.data)
  );

  if (
    joinConfig.timeoutMs !== undefined &&
    branchElapsedMs > joinConfig.timeoutMs
  ) {
    throw ApplicationFailure.nonRetryable(
      `Parallel join node ${joinNode.id} timed out`,
      "CanvasExecutionTimeout"
    );
  }

  const joinInputs: ParallelJoinBranchResult[] = taskResults.map(
    (taskResult, index) => {
      const branch = branchExecutions[index];
      if (!branch) {
        throw new Error(`Parallel split node ${node.id} missing branch`);
      }

      switch (taskResult.status) {
        case "fulfilled": {
          const runResult = taskResult.value;
          if (runResult.result.stoppedAt !== splitPlan.joinNodeId) {
            throw new Error(
              `Parallel split node ${node.id} did not reach join`
            );
          }
          const outputValue = runResult.result.output;
          if (isExecutionDataRef(outputValue)) {
            return {
              branchId: branch.joinInputId,
              outputRef: outputValue,
            };
          }
          return { branchId: branch.joinInputId, output: outputValue };
        }
        case "rejected": {
          const message =
            taskResult.reason instanceof Error
              ? taskResult.reason.message
              : String(taskResult.reason);
          if (splitConfig.errorHandling === "collectErrors") {
            return {
              branchId: branch.joinInputId,
              error: message,
            };
          }
          return { branchId: branch.joinInputId };
        }
        case "skipped": {
          if (splitConfig.errorHandling === "collectErrors") {
            return {
              branchId: branch.joinInputId,
              error: taskResult.reason,
            };
          }
          return { branchId: branch.joinInputId };
        }
        default: {
          throw new Error(
            `Parallel split node ${node.id} has invalid branch result`
          );
        }
      }
    }
  );

  const joinResult = await executeActivities.executeParallelJoinNode({
    executionId,
    teamId,
    node: joinNode,
    branches: joinInputs,
  });

  const joinStep = buildCompletedStep(joinNode, joinInputs, joinResult);
  trace.steps.push(joinStep);
  updateTraceForInput(trace, joinStep);
  updateTraceForOutput(trace, joinStep);
  trace.status = "RUNNING";
  trace.totalLatencyMs = joinResult.completedAt - startedAt;

  await updateActivities.updateCanvasExecution({
    executionId,
    teamId,
    status: "RUNNING",
    currentNodeId: joinNode.id,
    trace,
    latencyMs: trace.totalLatencyMs,
    ...getWorkflowMetadata("RUNNING"),
  });

  const joinOutput = joinResult.outputRef ?? joinResult.output;
  const resolveParams = {
    node: joinNode,
    edgesBySource: graph.edgesBySource,
    branchId: null,
  };
  const nextNodeId = resolveNextEdge(resolveParams).nextNodeId;

  return {
    nextNodeId,
    output: joinOutput,
    cancelled: false,
  };
}
