"use client";

import type {
  ExecutionStatus,
  ExecutionTrace,
  NodeStatus,
} from "@openbeam/types/canvas";
import { useMemo } from "react";
import { useExecutionStore } from "./execution-store";

const EXECUTION_TO_NODE_STATUS: Record<ExecutionStatus, NodeStatus> = {
  PENDING: "pending",
  RUNNING: "running",
  WAITING_INPUT: "waiting",
  WAITING_APPROVAL: "waiting",
  COMPLETED: "success",
  FAILED: "error",
  CANCELLED: "error",
  TIMED_OUT: "error",
};

type EdgeExecutionState = "idle" | "running" | "success" | "error";

function mapEdgeState(status?: NodeStatus): EdgeExecutionState {
  if (!status) {
    return "idle";
  }
  if (status === "running" || status === "waiting" || status === "pending") {
    return "running";
  }
  if (status === "success") {
    return "success";
  }
  if (status === "error") {
    return "error";
  }
  return "idle";
}

type OverlayResult = {
  nodeStatusMap: Record<string, NodeStatus> | undefined;
  edgeStateMap: Record<string, EdgeExecutionState> | undefined;
  isActive: boolean;
};

export function deriveExecutionOverlays(
  execution: ExecutionTrace | null,
  isExecuting: boolean,
  edges: ReadonlyArray<{ id: string; source: string; target: string }>
): OverlayResult {
  if (!(execution && isExecuting)) {
    return {
      nodeStatusMap: undefined,
      edgeStateMap: undefined,
      isActive: false,
    };
  }

  const statusByNodeId = new Map<string, NodeStatus>();

  for (const step of execution.steps) {
    statusByNodeId.set(step.nodeId, EXECUTION_TO_NODE_STATUS[step.status]);
  }

  if (execution.currentNodeId) {
    statusByNodeId.set(
      execution.currentNodeId,
      EXECUTION_TO_NODE_STATUS[execution.status]
    );
  }

  const nodeStatusMap = Object.fromEntries(statusByNodeId);

  const edgeStateMap: Record<string, EdgeExecutionState> = {};
  for (const edge of edges) {
    const targetStatus = statusByNodeId.get(edge.target);
    const sourceStatus = statusByNodeId.get(edge.source);
    const state = mapEdgeState(targetStatus ?? sourceStatus);
    if (state !== "idle") {
      edgeStateMap[edge.id] = state;
    }
  }

  return { nodeStatusMap, edgeStateMap, isActive: true };
}

export function useExecutionOverlays(
  edges: ReadonlyArray<{ id: string; source: string; target: string }>
): OverlayResult {
  const currentExecution = useExecutionStore((s) => s.currentExecution);
  const isExecuting = useExecutionStore((s) => s.isExecuting);

  return useMemo(
    () => deriveExecutionOverlays(currentExecution, isExecuting, edges),
    [currentExecution, isExecuting, edges]
  );
}
