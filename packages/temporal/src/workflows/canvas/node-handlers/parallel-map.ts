import {
  type ExecutionPlanNode,
  type ExecutionTrace,
  ParallelMapNodeConfigSchema,
} from "@openplane/types/canvas";
import { ApplicationFailure, sleep, workflowInfo } from "@temporalio/workflow";

import {
  buildCompletedStep,
  buildFailedStep,
  updateTraceForInput,
  updateTraceForOutput,
} from "../trace";
import { executeActivities, updateActivities } from "../utils/activity-proxies";
import { ParallelMapTaskError, resolveFailureMessage } from "../utils/errors";
import type { ExecutionContext } from "../utils/execution";
import {
  getWorkflowMetadata,
  runTasksWithConcurrency,
} from "../utils/execution";
import type { ExecutionGraph } from "../utils/graph";
import { buildParallelMapItemInput } from "../utils/parallel-map";
import type { ParallelMapPlan } from "../utils/resolution";
import { resolveNextEdge } from "../utils/resolution";
import { resolveNodeConfig } from "../utils/type-guards";

export interface ParallelMapHandlerParams {
  node: ExecutionPlanNode;
  currentPayload: unknown;
  lastStepOutput: unknown;
  trace: ExecutionTrace;
  startedAt: number;
  executionId: string;
  teamId: string;
  mapPlan: ParallelMapPlan;
  graph: ExecutionGraph;
  executionContext: ExecutionContext;
  state: { cancelled: boolean };
}

export interface ParallelMapResult {
  nextNodeId: string | null;
  output: unknown;
  cancelled: boolean;
}

function getTimestamp(): number {
  return workflowInfo().unsafe.now();
}

type ParallelMapItemResult =
  | { status: "fulfilled"; index: number; item: unknown; output: unknown }
  | { status: "rejected"; index: number; item: unknown; error: string };

function aggregateParallelMapResults(params: {
  entries: ParallelMapItemResult[];
  mode: "array" | "object" | "merge" | "custom";
}): unknown {
  const { entries, mode } = params;

  switch (mode) {
    case "array":
      return entries.map((entry) =>
        entry.status === "fulfilled" ? entry.output : null
      );
    case "object":
      return Object.fromEntries(
        entries.map((entry) => [
          entry.index,
          entry.status === "fulfilled" ? entry.output : { error: entry.error },
        ])
      );
    case "merge": {
      const merged: Record<string, unknown> = {};
      for (const entry of entries) {
        if (
          entry.status === "fulfilled" &&
          typeof entry.output === "object" &&
          entry.output !== null
        ) {
          Object.assign(merged, entry.output);
        }
      }
      return merged;
    }
    default:
      return entries.map((entry) => ({
        index: entry.index,
        item: entry.item,
        output: entry.status === "fulfilled" ? entry.output : undefined,
        error: entry.status === "rejected" ? entry.error : undefined,
        status: entry.status,
      }));
  }
}

export async function handleParallelMapNode(
  params: ParallelMapHandlerParams
): Promise<ParallelMapResult> {
  const {
    node,
    currentPayload,
    lastStepOutput,
    trace,
    startedAt,
    executionId,
    teamId,
    mapPlan,
    graph,
    executionContext,
    state,
  } = params;

  const mapConfig = ParallelMapNodeConfigSchema.parse(
    resolveNodeConfig(node.data)
  );

  const prepResult = await executeActivities.executeParallelMapNode({
    executionId,
    teamId,
    node,
    input: currentPayload,
  });

  const targetNode = graph.nodesById.get(mapPlan.targetNodeId);
  if (!targetNode) {
    throw ApplicationFailure.nonRetryable(
      `Parallel map target ${mapPlan.targetNodeId} not found`,
      "CanvasExecutionPlanError"
    );
  }

  const total = prepResult.collectionSize;
  const batchSize =
    mapConfig.batchSize && mapConfig.batchSize > 0
      ? mapConfig.batchSize
      : total;
  const concurrency = Math.max(1, mapConfig.maxConcurrency ?? 1);
  const entries: ParallelMapItemResult[] = [];
  const mapStartedAt = prepResult.startedAt;
  const mapStart = getTimestamp();
  let firstFailure: unknown | null = null;

  for (let offset = 0; offset < total; offset += batchSize) {
    const limit = Math.min(batchSize, total - offset);
    const batch = await executeActivities.resolveParallelMapBatch({
      executionId,
      teamId,
      collectionRef: prepResult.collectionRef,
      offset,
      limit,
    });
    const batchItems = batch.items.map((item, index) => {
      const itemIndex = offset + index;
      return {
        item,
        index: itemIndex,
        input: buildParallelMapItemInput({
          input: currentPayload,
          item,
          index: itemIndex,
          config: mapConfig,
        }),
      };
    });

    const tasks = batchItems.map((batchItem) => async () => {
      const taskStartedAt = getTimestamp();
      const inputValue = batchItem.input;
      try {
        const result = await executeActivities.executeCanvasNode({
          executionId,
          teamId,
          node: targetNode,
          input: inputValue,
          context: executionContext,
        });
        return {
          batchItem,
          input: inputValue,
          result,
          startedAt: taskStartedAt,
        };
      } catch (error) {
        throw new ParallelMapTaskError({
          error,
          item: batchItem.item,
          index: batchItem.index,
          input: inputValue,
          startedAt: taskStartedAt,
        });
      }
    });

    const taskResults = await runTasksWithConcurrency({
      tasks,
      maxConcurrency: Math.min(concurrency, batchItems.length || 1),
      stopOnError: !mapConfig.continueOnError,
    });

    for (let index = 0; index < taskResults.length; index += 1) {
      const taskResult = taskResults[index];
      const batchItem = batchItems[index];
      const inputValue = batchItem?.input;

      if (!(taskResult && batchItem && inputValue)) {
        continue;
      }

      if (taskResult.status === "fulfilled") {
        const completed = taskResult.value;
        const step = buildCompletedStep(
          targetNode,
          inputValue,
          completed.result
        );
        trace.steps.push(step);
        updateTraceForInput(trace, step);
        updateTraceForOutput(trace, step);

        entries.push({
          status: "fulfilled",
          index: completed.batchItem.index,
          item: completed.batchItem.item,
          output: completed.result.outputRef ?? completed.result.output,
        });
        continue;
      }

      if (taskResult.status === "rejected") {
        const reason =
          taskResult.reason instanceof ParallelMapTaskError
            ? taskResult.reason.details
            : undefined;
        const message = resolveFailureMessage(reason?.error ?? taskResult);
        const failureStartedAt = reason?.startedAt ?? getTimestamp();
        const completedAt = getTimestamp();
        const step = buildFailedStep({
          node: targetNode,
          input: reason?.input ?? inputValue,
          error: message,
          startedAt: failureStartedAt,
          completedAt,
        });
        trace.steps.push(step);
        updateTraceForInput(trace, step);

        entries.push({
          status: "rejected",
          index: reason?.index ?? batchItem.index,
          item: reason?.item ?? batchItem.item,
          error: message,
        });

        if (!(mapConfig.continueOnError || firstFailure)) {
          firstFailure = reason?.error ?? taskResult.reason;
        }
      }
    }

    if (mapConfig.progressTracking) {
      trace.status = "RUNNING";
      trace.totalLatencyMs = getTimestamp() - startedAt;

      await updateActivities.updateCanvasExecution({
        executionId,
        teamId,
        status: "RUNNING",
        currentNodeId: node.id,
        trace,
        latencyMs: trace.totalLatencyMs,
        ...getWorkflowMetadata("RUNNING"),
      });
    }

    if (state.cancelled) {
      return {
        nextNodeId: null,
        output: lastStepOutput,
        cancelled: true,
      };
    }

    if (mapConfig.batchDelayMs > 0 && offset + batchSize < total) {
      await sleep(mapConfig.batchDelayMs);
    }

    if (
      mapConfig.timeout !== undefined &&
      getTimestamp() - mapStart > mapConfig.timeout
    ) {
      throw ApplicationFailure.nonRetryable(
        `Parallel map node ${node.id} timed out`,
        "CanvasExecutionTimeout"
      );
    }

    if (!mapConfig.continueOnError && firstFailure) {
      throw firstFailure;
    }
  }

  const aggregatedOutput = aggregateParallelMapResults({
    entries,
    mode: mapConfig.aggregationMode,
  });

  const storedOutput = await executeActivities.storeParallelMapOutput({
    executionId,
    teamId,
    nodeId: node.id,
    output: aggregatedOutput,
  });

  const mapStep = buildCompletedStep(node, currentPayload, {
    output: storedOutput.output,
    outputRef: storedOutput.outputRef,
    inputRef: prepResult.inputRef,
    startedAt: mapStartedAt,
    completedAt: storedOutput.completedAt,
    latencyMs: storedOutput.completedAt - mapStartedAt,
  });
  trace.steps.push(mapStep);
  updateTraceForInput(trace, mapStep);
  updateTraceForOutput(trace, mapStep);
  trace.status = "RUNNING";
  trace.totalLatencyMs = storedOutput.completedAt - startedAt;

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

  return {
    nextNodeId: resolveNextEdge(resolveParams).nextNodeId,
    output: storedOutput.outputRef ?? storedOutput.output,
    cancelled: false,
  };
}
