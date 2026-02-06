import type {
  ExecutionPlanNode,
  ExecutionStatus,
  ExecutionTrace,
} from "@openplane/types/canvas";
import type {
  AgentCanvasExecutionInput,
  AgentCanvasExecutionOutput,
} from "@openplane/types/temporal/workflows";
import { sleep, startChild } from "@temporalio/workflow";

import { TASK_QUEUES } from "../../../config/task-queues";
import { generateWorkflowId } from "../../../utils/workflow-id";
import { cancelSignal } from "../../types";
import {
  buildCompletedStep,
  updateTraceForInput,
  updateTraceForOutput,
} from "../trace";
import {
  stepActivities,
  subWorkflowActivities,
  updateActivities,
} from "../utils/activity-proxies";
import type { ExecutionContext } from "../utils/execution";
import { getWorkflowMetadata } from "../utils/execution";
import type { ExecutionGraph } from "../utils/graph";
import { resolveNextEdge } from "../utils/resolution";

export interface SubWorkflowHandlerParams {
  node: ExecutionPlanNode;
  currentPayload: unknown;
  trace: ExecutionTrace;
  startedAt: number;
  executionId: string;
  teamId: string;
  triggeredById: string;
  graph: ExecutionGraph;
  executionContext: ExecutionContext;
  agentCanvasExecutionWorkflow: (
    input: AgentCanvasExecutionInput
  ) => Promise<AgentCanvasExecutionOutput>;
}

export interface SubWorkflowResult {
  nextNodeId: string | null;
  output: unknown;
  cancelled: boolean;
}

function getTimestamp(): number {
  return Date.now();
}

export async function handleSubWorkflowNode(
  params: SubWorkflowHandlerParams
): Promise<SubWorkflowResult> {
  const {
    node,
    currentPayload,
    trace,
    startedAt,
    executionId,
    teamId,
    triggeredById,
    graph,
    executionContext,
    agentCanvasExecutionWorkflow,
  } = params;

  const stepStartedAt = getTimestamp();

  const stepResult = await stepActivities.createCanvasExecutionStep({
    executionId,
    teamId,
    node,
    input: currentPayload,
    status: "RUNNING",
    startedAt: stepStartedAt,
  });

  const prepared = await subWorkflowActivities.prepareSubWorkflowExecution({
    executionId,
    teamId,
    node,
    input: currentPayload,
    context: executionContext,
  });

  const childInput: AgentCanvasExecutionInput = {
    executionId: prepared.executionId,
    agentCanvasId: prepared.agentCanvasId,
    versionNumber: prepared.versionNumber,
    teamId,
    triggeredById,
    triggerSource: `subworkflow:${executionId}`,
    input: prepared.input,
    canvas: prepared.canvas,
  };

  const childWorkflowId = generateWorkflowId({
    type: "canvas",
    executionId: prepared.executionId,
  });

  const childHandle = await startChild(agentCanvasExecutionWorkflow, {
    args: [childInput],
    workflowId: childWorkflowId,
    taskQueue: TASK_QUEUES.CANVAS,
  });

  await updateActivities.updateCanvasExecution({
    executionId: prepared.executionId,
    teamId,
    status: "RUNNING",
    workflowId: childHandle.workflowId,
    runId: childHandle.firstExecutionRunId,
    temporalStatus: "RUNNING",
  });

  const failSubWorkflow = async (message: string): Promise<never> => {
    const completedAt = getTimestamp();
    await stepActivities.updateCanvasExecutionStep({
      executionId,
      teamId,
      stepId: stepResult.stepId,
      nodeId: node.id,
      status: "FAILED",
      error: message,
      completedAt,
      latencyMs: completedAt - stepStartedAt,
    });
    throw new Error(message);
  };

  let resolvedOutput: unknown;
  const childStatus = prepared.waitForCompletion ? "COMPLETED" : "STARTED";

  if (prepared.waitForCompletion) {
    const awaitChildResult = async (): Promise<AgentCanvasExecutionOutput> => {
      if (prepared.timeoutMs && prepared.timeoutMs > 0) {
        const outcome = await Promise.race([
          childHandle
            .result()
            .then((result) => ({ type: "result" as const, result })),
          sleep(prepared.timeoutMs).then(() => ({
            type: "timeout" as const,
          })),
        ]);

        if (outcome.type !== "result") {
          await childHandle.signal(cancelSignal);
          return await failSubWorkflow(`Sub-workflow ${node.id} timed out`);
        }

        return outcome.result;
      }

      return await childHandle.result();
    };

    const childResult = await awaitChildResult();

    if (childResult.status !== "COMPLETED") {
      await failSubWorkflow(
        `Sub-workflow ${node.id} failed with status ${childResult.status}`
      );
    }

    resolvedOutput = childResult.output;

    if (
      prepared.outputMappings &&
      Object.keys(prepared.outputMappings).length > 0
    ) {
      const mapped = await subWorkflowActivities.resolveSubWorkflowOutput({
        teamId,
        agentCanvasId: prepared.agentCanvasId,
        output: resolvedOutput,
        mappings: prepared.outputMappings,
      });
      resolvedOutput = mapped.output;
    }
  } else {
    resolvedOutput = {
      executionId: prepared.executionId,
      workflowId: childHandle.workflowId,
      runId: childHandle.firstExecutionRunId,
      status: "STARTED",
    };
  }

  const completedAt = getTimestamp();
  const stepStatus: ExecutionStatus = "COMPLETED";
  const stepOutput = {
    executionId: prepared.executionId,
    workflowId: childHandle.workflowId,
    runId: childHandle.firstExecutionRunId,
    output: resolvedOutput,
    childStatus,
  };

  const stepUpdate = await stepActivities.updateCanvasExecutionStep({
    executionId,
    teamId,
    stepId: stepResult.stepId,
    nodeId: node.id,
    status: stepStatus,
    output: stepOutput,
    completedAt,
    latencyMs: completedAt - stepStartedAt,
  });

  const step = buildCompletedStep(node, currentPayload, {
    output: stepUpdate.output,
    outputRef: stepUpdate.outputRef,
    inputRef: stepResult.inputRef,
    startedAt: stepStartedAt,
    completedAt,
    latencyMs: completedAt - stepStartedAt,
  });

  trace.steps.push(step);
  updateTraceForInput(trace, step);
  updateTraceForOutput(trace, step);
  trace.status = "RUNNING";
  trace.totalLatencyMs = completedAt - startedAt;

  await updateActivities.updateCanvasExecution({
    executionId,
    teamId,
    status: "RUNNING",
    currentNodeId: node.id,
    trace,
    latencyMs: trace.totalLatencyMs,
    ...getWorkflowMetadata("RUNNING"),
  });

  const resolveParams = {
    node,
    edgesBySource: graph.edgesBySource,
    branchId: null,
  };
  const nextNodeId = resolveNextEdge(resolveParams).nextNodeId;

  return { nextNodeId, output: resolvedOutput, cancelled: false };
}
