import {
  type ExecutionPlan,
  type ExecutionPlanNode,
  type ExecutionTrace,
  LoopNodeConfigSchema,
} from "@openplane/types/canvas";
import type { ExecutionPolicy } from "@openplane/types/services/policy";
import type { LoopIterationError, LoopState } from "@openplane/types/temporal";
import type {
  AgentCanvasExecutionInput,
  AgentCanvasExecutionOutput,
} from "@openplane/types/temporal/workflows";
import {
  ApplicationFailure,
  condition,
  workflowInfo,
} from "@temporalio/workflow";

import { SAFETY_CEILINGS } from "../../config/constants";

import {
  handleParallelMapNode,
  type ParallelMapHandlerParams,
} from "./node-handlers/parallel-map";
import {
  handleParallelSplitNode,
  type ParallelSplitHandlerParams,
} from "./node-handlers/parallel-split";
import {
  handleRetryNode,
  type RetryHandlerParams,
} from "./node-handlers/retry";
import {
  handleSubWorkflowNode,
  type SubWorkflowHandlerParams,
} from "./node-handlers/sub-workflow";
import {
  handleTryCatchNode,
  type TryCatchHandlerParams,
} from "./node-handlers/try-catch";
import {
  buildCompletedStep,
  buildFailedStep,
  extractBranchId,
  updateTraceForInput,
  updateTraceForOutput,
} from "./trace";
import { executeActivities, updateActivities } from "./utils/activity-proxies";
import { type ExecutionContext, getWorkflowMetadata } from "./utils/execution";
import { buildExecutionGraph, type ExecutionGraph } from "./utils/graph";
import {
  type ParallelMapPlan,
  type ParallelSplitPlan,
  resolveNextEdge,
  resolveParallelMapPlan,
  resolveParallelSplitPlan,
} from "./utils/resolution";
import { resolveNodeConfig } from "./utils/type-guards";

export interface CanvasExecutionState {
  paused: boolean;
  cancelled: boolean;
}

export interface ExecutePlanParams {
  input: AgentCanvasExecutionInput;
  plan: ExecutionPlan;
  trace: ExecutionTrace;
  state: CanvasExecutionState;
  approvalResponses: Map<string, unknown>;
  inputResponses: Map<string, unknown>;
  startedAt: number;
  initialLoopStates?: Map<string, LoopState>;
  initialLoopStack?: string[];
  agentCanvasExecutionWorkflow: (
    input: AgentCanvasExecutionInput
  ) => Promise<AgentCanvasExecutionOutput>;
  shouldContinueAsNew?: () => boolean;
  resumeFromNodeId?: string | null;
  resumePayload?: unknown;
  resumeLastStepOutput?: unknown;
  metrics?: { nodeExecutionCount: number };
}

export interface ExecutePlanResult {
  output: unknown;
  cancelled: boolean;
  loopStates: Map<string, LoopState>;
  loopStack: string[];
  continueAsNewRequested: boolean;
  nextNodeId: string | null;
  currentPayload: unknown;
  lastStepOutput: unknown;
}

type RunExecutionParams = {
  startNodeId: string | null;
  input: unknown;
  stopNodeIds?: Set<string>;
  loopStates: Map<string, LoopState>;
  loopStack: string[];
  initialLastStepOutput?: unknown;
};

type RunExecutionResult = {
  output: unknown;
  cancelled: boolean;
  stoppedAt?: string | null;
  continueAsNewRequested?: boolean;
  nextNodeId?: string | null;
  currentPayload?: unknown;
  lastStepOutput?: unknown;
};

function getTimestamp(): number {
  return workflowInfo().unsafe.now();
}

export async function executePlanNodes(
  params: ExecutePlanParams
): Promise<ExecutePlanResult> {
  const {
    input,
    plan,
    trace,
    state,
    approvalResponses,
    inputResponses,
    startedAt,
    agentCanvasExecutionWorkflow,
  } = params;

  const graph: ExecutionGraph = buildExecutionGraph(plan);
  const workflowMeta = workflowInfo();
  const executionContext: ExecutionContext = {
    executionId: input.executionId,
    agentCanvasId: input.agentCanvasId,
    versionNumber: input.versionNumber,
    teamId: input.teamId,
    triggeredById: input.triggeredById,
    triggerSource: input.triggerSource,
    workflowId: workflowMeta.workflowId,
    runId: workflowMeta.runId,
    input: input.input,
  };
  const parallelPlans = new Map<string, ParallelSplitPlan>();
  const parallelMapPlans = new Map<string, ParallelMapPlan>();

  const runExecution = async (
    runParams: RunExecutionParams
  ): // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: workflow execution orchestration is inherently complex
  Promise<RunExecutionResult> => {
    const {
      startNodeId,
      input: initialInput,
      stopNodeIds,
      loopStates: localLoopStates,
      loopStack: localLoopStack,
      initialLastStepOutput,
    } = runParams;
    let currentPayload: unknown = initialInput;
    let lastStepOutput: unknown = initialLastStepOutput;
    let currentNodeId: string | null = startNodeId;
    let pendingLoopError: {
      loopNodeId: string;
      error: LoopIterationError;
    } | null = null;
    let nodeExecutionCount = 0;

    while (currentNodeId) {
      nodeExecutionCount += 1;
      if (params.metrics) {
        params.metrics.nodeExecutionCount = nodeExecutionCount;
      }
      if (nodeExecutionCount > SAFETY_CEILINGS.MAX_TOTAL_NODE_EXECUTIONS) {
        throw ApplicationFailure.nonRetryable(
          `Execution exceeded ${SAFETY_CEILINGS.MAX_TOTAL_NODE_EXECUTIONS} total node executions`,
          "SafetyCeilingExceeded"
        );
      }

      if (stopNodeIds?.has(currentNodeId)) {
        return {
          output: currentPayload,
          cancelled: state.cancelled,
          stoppedAt: currentNodeId,
        };
      }

      const node = graph.nodesById.get(currentNodeId);
      if (!node) {
        throw ApplicationFailure.nonRetryable(
          `Node ${currentNodeId} not found`,
          "CanvasExecutionPlanError"
        );
      }

      await condition(() => !state.paused || state.cancelled);

      if (state.cancelled) {
        break;
      }

      trace.currentNodeId = node.id;
      const stepStartedAt = getTimestamp();

      try {
        const controlOutcome = await handleControlNodes(node, {
          currentPayload,
          lastStepOutput,
          graph,
          executionContext,
          trace,
          state,
          startedAt,
          input,
          approvalResponses,
          inputResponses,
          parallelPlans,
          parallelMapPlans,
          agentCanvasExecutionWorkflow,
          runExecution,
        });

        if (controlOutcome) {
          if (controlOutcome.cancelled) {
            return { output: controlOutcome.output, cancelled: true };
          }

          currentPayload = controlOutcome.output;
          lastStepOutput = controlOutcome.output;
          currentNodeId = controlOutcome.nextNodeId;
          continue;
        }

        let result:
          | Awaited<ReturnType<typeof executeActivities.executeCanvasNode>>
          | Awaited<ReturnType<typeof executeActivities.executeLoopNode>>;
        let branchId: string | null = null;

        if (node.type === "loop") {
          const iterationError =
            pendingLoopError?.loopNodeId === node.id
              ? pendingLoopError.error
              : undefined;
          if (iterationError) {
            pendingLoopError = null;
          }

          const loopResult = await executeActivities.executeLoopNode({
            executionId: input.executionId,
            teamId: input.teamId,
            node,
            input: currentPayload,
            loopState: localLoopStates.get(node.id),
            iterationError,
          });
          result = loopResult;

          if (loopResult.loopState) {
            localLoopStates.set(node.id, loopResult.loopState);
          } else {
            localLoopStates.delete(node.id);
          }

          branchId = loopResult.branchId;
        } else {
          result = await executeActivities.executeCanvasNode({
            executionId: input.executionId,
            teamId: input.teamId,
            node,
            input: currentPayload,
            context: executionContext,
          });
        }

        const step = buildCompletedStep(node, currentPayload, result);
        trace.steps.push(step);
        updateTraceForInput(trace, step);
        updateTraceForOutput(trace, step);
        trace.status = "RUNNING";
        trace.totalLatencyMs = result.completedAt - startedAt;

        if (trace.totalLatencyMs > SAFETY_CEILINGS.MAX_EXECUTION_DURATION_MS) {
          throw ApplicationFailure.nonRetryable(
            `Execution exceeded ${SAFETY_CEILINGS.MAX_EXECUTION_DURATION_MS}ms wallclock time`,
            "SafetyCeilingExceeded"
          );
        }

        const policy = input.policy as ExecutionPolicy | undefined;
        if (policy) {
          if (
            policy.maxDurationMs > 0 &&
            trace.totalLatencyMs > policy.maxDurationMs
          ) {
            throw ApplicationFailure.nonRetryable(
              `Policy budget exceeded: duration ${trace.totalLatencyMs}ms > limit ${policy.maxDurationMs}ms`,
              "PolicyBudgetExceeded"
            );
          }

          if (
            policy.maxToolCalls > 0 &&
            nodeExecutionCount > policy.maxToolCalls
          ) {
            throw ApplicationFailure.nonRetryable(
              `Policy budget exceeded: ${nodeExecutionCount} tool calls > limit ${policy.maxToolCalls}`,
              "PolicyBudgetExceeded"
            );
          }

          const stepTokens =
            typeof result.output === "object" &&
            result.output !== null &&
            "tokenUsage" in result.output
              ? ((result.output as { tokenUsage?: { total?: number } })
                  .tokenUsage?.total ?? 0)
              : 0;
          if (policy.maxTokenBudget > 0 && stepTokens > 0) {
            const totalTokens = trace.steps.reduce((sum, s) => {
              const usage =
                typeof s.output === "object" &&
                s.output !== null &&
                "tokenUsage" in s.output
                  ? ((s.output as { tokenUsage?: { total?: number } })
                      .tokenUsage?.total ?? 0)
                  : 0;
              return sum + usage;
            }, 0);
            if (totalTokens > policy.maxTokenBudget) {
              throw ApplicationFailure.nonRetryable(
                `Policy budget exceeded: ${totalTokens} tokens > limit ${policy.maxTokenBudget}`,
                "PolicyBudgetExceeded"
              );
            }
          }
        }

        const stepOutput = result.outputRef ?? result.output;
        if (node.type === "condition") {
          branchId = extractBranchId(stepOutput);
        }

        const nextNodeId = resolveNextEdge({
          node,
          edgesBySource: graph.edgesBySource,
          branchId,
        }).nextNodeId;

        currentPayload =
          node.type === "condition" ? currentPayload : stepOutput;
        lastStepOutput = stepOutput;
        currentNodeId = nextNodeId;

        if (node.type === "loop") {
          if (branchId === "body") {
            if (localLoopStack.at(-1) !== node.id) {
              if (
                localLoopStack.length >= SAFETY_CEILINGS.MAX_LOOP_NESTING_DEPTH
              ) {
                throw ApplicationFailure.nonRetryable(
                  `Loop nesting depth exceeded ${SAFETY_CEILINGS.MAX_LOOP_NESTING_DEPTH}`,
                  "SafetyCeilingExceeded"
                );
              }
              localLoopStack.push(node.id);
            }
          } else if (branchId === "done") {
            const index = localLoopStack.lastIndexOf(node.id);
            if (index >= 0) {
              localLoopStack.splice(index, 1);
            }
            localLoopStates.delete(node.id);
          }
        }

        await updateActivities.updateCanvasExecution({
          executionId: input.executionId,
          teamId: input.teamId,
          status: "RUNNING",
          currentNodeId: node.id,
          trace,
          latencyMs: trace.totalLatencyMs,
          ...getWorkflowMetadata("RUNNING"),
        });

        if (!stopNodeIds && params.shouldContinueAsNew?.()) {
          return {
            output: currentPayload,
            cancelled: false,
            continueAsNewRequested: true,
            nextNodeId: currentNodeId,
            currentPayload,
            lastStepOutput,
          };
        }
      } catch (error) {
        const completedAt = getTimestamp();
        const message = error instanceof Error ? error.message : String(error);
        const existingStep = trace.steps.at(-1);
        const isExistingFailedStep =
          existingStep?.nodeId === node.id && existingStep.status === "FAILED";
        const step = isExistingFailedStep
          ? existingStep
          : buildFailedStep({
              node,
              input: currentPayload,
              error: message,
              startedAt: stepStartedAt,
              completedAt,
            });

        if (!isExistingFailedStep) {
          trace.steps.push(step);
          updateTraceForInput(trace, step);
        }
        trace.currentNodeId = node.id;

        const activeLoopId = localLoopStack.at(-1);
        if (activeLoopId && activeLoopId !== node.id) {
          const loopNode = graph.nodesById.get(activeLoopId);
          if (loopNode?.type === "loop") {
            const loopConfig = LoopNodeConfigSchema.safeParse(
              resolveNodeConfig(loopNode.data)
            );

            if (
              loopConfig.success &&
              loopConfig.data.errorHandling !== "stop"
            ) {
              const loopState = localLoopStates.get(activeLoopId);
              const iterationError: LoopIterationError = {
                message,
                nodeId: node.id,
                nodeType: node.type,
                iteration: loopState?.iteration ?? 0,
                index: loopState?.index,
                occurredAt: completedAt,
              };

              pendingLoopError = {
                loopNodeId: activeLoopId,
                error: iterationError,
              };

              trace.status = "RUNNING";
              trace.totalLatencyMs = completedAt - startedAt;

              await updateActivities.updateCanvasExecution({
                executionId: input.executionId,
                teamId: input.teamId,
                status: "RUNNING",
                currentNodeId: node.id,
                trace,
                latencyMs: trace.totalLatencyMs,
                ...getWorkflowMetadata("RUNNING"),
              });

              currentNodeId = activeLoopId;
              continue;
            }
          }
        }

        trace.status = "FAILED";
        trace.error = message;
        trace.completedAt = completedAt;
        trace.totalLatencyMs = completedAt - startedAt;

        await updateActivities.updateCanvasExecution({
          executionId: input.executionId,
          teamId: input.teamId,
          status: "FAILED",
          currentNodeId: node.id,
          error: message,
          trace,
          latencyMs: trace.totalLatencyMs,
          startedAt,
          completedAt,
          ...getWorkflowMetadata("FAILED"),
        });

        throw error;
      }
    }

    return { output: lastStepOutput, cancelled: state.cancelled };
  };

  const rootLoopStates = params.initialLoopStates
    ? new Map(params.initialLoopStates)
    : new Map<string, LoopState>();
  const rootLoopStack = params.initialLoopStack
    ? [...params.initialLoopStack]
    : [];
  const executionResult = await runExecution({
    startNodeId: params.resumeFromNodeId ?? plan.startNodeId,
    input: params.resumePayload ?? input.input,
    loopStates: rootLoopStates,
    loopStack: rootLoopStack,
    initialLastStepOutput: params.resumeLastStepOutput,
  });

  return {
    output: executionResult.output,
    cancelled: executionResult.cancelled,
    loopStates: rootLoopStates,
    loopStack: rootLoopStack,
    continueAsNewRequested: executionResult.continueAsNewRequested ?? false,
    nextNodeId: executionResult.nextNodeId ?? null,
    currentPayload: executionResult.currentPayload,
    lastStepOutput: executionResult.lastStepOutput,
  };
}

async function handleControlNodes(
  node: ExecutionPlanNode,
  context: {
    currentPayload: unknown;
    lastStepOutput: unknown;
    graph: ExecutionGraph;
    executionContext: ExecutionContext;
    trace: ExecutionTrace;
    state: CanvasExecutionState;
    startedAt: number;
    input: AgentCanvasExecutionInput;
    approvalResponses: Map<string, unknown>;
    inputResponses: Map<string, unknown>;
    parallelPlans: Map<string, ParallelSplitPlan>;
    parallelMapPlans: Map<string, ParallelMapPlan>;
    agentCanvasExecutionWorkflow: (
      input: AgentCanvasExecutionInput
    ) => Promise<AgentCanvasExecutionOutput>;
    runExecution: (params: RunExecutionParams) => Promise<RunExecutionResult>;
  }
): Promise<{
  nextNodeId: string | null;
  output: unknown;
  cancelled: boolean;
} | null> {
  const { graph, executionContext, trace, state, startedAt, input } = context;

  switch (node.type) {
    case "approval":
      throw ApplicationFailure.nonRetryable(
        "Approval nodes not supported in this executor version",
        "UnsupportedNodeType"
      );

    case "input":
      throw ApplicationFailure.nonRetryable(
        "Input nodes not supported in this executor version",
        "UnsupportedNodeType"
      );

    case "sub_workflow": {
      const subParams: SubWorkflowHandlerParams = {
        node,
        currentPayload: context.currentPayload,
        trace,
        startedAt,
        executionId: input.executionId,
        teamId: input.teamId,
        triggeredById: input.triggeredById,
        graph,
        executionContext,
        agentCanvasExecutionWorkflow: context.agentCanvasExecutionWorkflow,
      };
      return await handleSubWorkflowNode(subParams);
    }

    case "try_catch": {
      const tryCatchParams: TryCatchHandlerParams = {
        node,
        currentPayload: context.currentPayload,
        trace,
        startedAt,
        executionId: input.executionId,
        teamId: input.teamId,
        graph,
        executionContext,
      };
      return await handleTryCatchNode(tryCatchParams);
    }

    case "retry": {
      const retryParams: RetryHandlerParams = {
        node,
        currentPayload: context.currentPayload,
        lastStepOutput: context.lastStepOutput,
        trace,
        startedAt,
        executionId: input.executionId,
        teamId: input.teamId,
        graph,
        executionContext,
        state,
      };
      return await handleRetryNode(retryParams);
    }

    case "parallel_split": {
      const cachedPlan = context.parallelPlans.get(node.id);
      const splitPlan =
        cachedPlan ??
        resolveParallelSplitPlan({
          splitNode: node,
          nodesById: graph.nodesById,
          edgesBySource: graph.edgesBySource,
          edgesByTarget: graph.edgesByTarget,
        });
      if (!cachedPlan) {
        context.parallelPlans.set(node.id, splitPlan);
      }

      const splitParams: ParallelSplitHandlerParams = {
        node,
        currentPayload: context.currentPayload,
        lastStepOutput: context.lastStepOutput,
        trace,
        startedAt,
        executionId: input.executionId,
        teamId: input.teamId,
        splitPlan,
        graph,
        runExecution: context.runExecution,
        state,
      };
      return await handleParallelSplitNode(splitParams);
    }

    case "parallel_map": {
      const cachedPlan = context.parallelMapPlans.get(node.id);
      const mapPlan =
        cachedPlan ??
        resolveParallelMapPlan({
          mapNode: node,
          nodesById: graph.nodesById,
          edgesBySource: graph.edgesBySource,
        });
      if (!cachedPlan) {
        context.parallelMapPlans.set(node.id, mapPlan);
      }

      const mapParams: ParallelMapHandlerParams = {
        node,
        currentPayload: context.currentPayload,
        lastStepOutput: context.lastStepOutput,
        trace,
        startedAt,
        executionId: input.executionId,
        teamId: input.teamId,
        mapPlan,
        graph,
        executionContext,
        state,
      };
      return await handleParallelMapNode(mapParams);
    }

    case "parallel_join":
      throw ApplicationFailure.nonRetryable(
        `Parallel join node ${node.id} executed without split`,
        "CanvasExecutionPlanError"
      );

    default:
      return null;
  }
}
