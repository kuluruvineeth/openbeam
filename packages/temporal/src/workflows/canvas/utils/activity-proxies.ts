import { proxyActivities } from "@temporalio/workflow";
import type { CanvasExecutionActivities } from "../../../activities/canvas/types";

export const executeActivities = proxyActivities<
  Pick<
    CanvasExecutionActivities,
    | "executeCanvasNode"
    | "executeLoopNode"
    | "executeParallelSplitNode"
    | "executeParallelJoinNode"
    | "executeParallelMapNode"
    | "resolveParallelMapBatch"
    | "storeParallelMapOutput"
  >
>({
  startToCloseTimeout: "5m",
  scheduleToCloseTimeout: "10m",
  heartbeatTimeout: "2m",
  retry: {
    maximumAttempts: 3,
    initialInterval: "2s",
    backoffCoefficient: 2,
    maximumInterval: "1m",
    nonRetryableErrorTypes: [
      "AuthorizationError",
      "CanvasNotFoundError",
      "ExecutionNotFoundError",
      "UnsupportedNodeType",
      "CanvasNodeExecutionError",
      "InvalidInputError",
    ],
  },
});

export const executeNoRetryActivities = proxyActivities<
  Pick<CanvasExecutionActivities, "executeCanvasNode">
>({
  startToCloseTimeout: "10m",
  scheduleToCloseTimeout: "10m",
  heartbeatTimeout: "2m",
  retry: {
    maximumAttempts: 1,
  },
});

export const updateActivities = proxyActivities<
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

export const stepActivities = proxyActivities<
  Pick<
    CanvasExecutionActivities,
    | "createCanvasExecutionStep"
    | "updateCanvasExecutionStep"
    | "createCanvasApproval"
  >
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

export const subWorkflowActivities = proxyActivities<
  Pick<
    CanvasExecutionActivities,
    "prepareSubWorkflowExecution" | "resolveSubWorkflowOutput"
  >
>({
  startToCloseTimeout: "2m",
  scheduleToCloseTimeout: "5m",
  heartbeatTimeout: "30s",
  retry: {
    maximumAttempts: 3,
    initialInterval: "2s",
    backoffCoefficient: 2,
    maximumInterval: "1m",
    nonRetryableErrorTypes: [
      "AuthorizationError",
      "CanvasNotFoundError",
      "ExecutionNotFoundError",
      "InvalidInputError",
      "SubWorkflowNotFoundError",
    ],
  },
});
