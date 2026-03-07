"use client";

import type { ExecutionTrace, StepExecution } from "@openbeam/types/canvas";
import type { NodeExecutionOverlay } from "@openbeam/types/canvas/execution-ui";
import type { TimelineStepStatus } from "@openbeam/types/canvas/timeline";
import { useMemo } from "react";

function mapExecutionStatusToTimeline(
  status: StepExecution["status"]
): TimelineStepStatus {
  switch (status) {
    case "PENDING":
      return "pending";
    case "RUNNING":
      return "running";
    case "COMPLETED":
      return "success";
    case "FAILED":
      return "error";
    case "CANCELLED":
      return "cancelled";
    case "TIMED_OUT":
      return "error";
    case "WAITING_APPROVAL":
    case "WAITING_INPUT":
      return "queued";
    default:
      return "pending";
  }
}

export function useNodeExecutionOverlays(
  execution: ExecutionTrace | null
): Map<string, NodeExecutionOverlay> {
  return useMemo(() => {
    const overlays = new Map<string, NodeExecutionOverlay>();

    if (!execution) {
      return overlays;
    }

    for (const step of execution.steps) {
      const status = mapExecutionStatusToTimeline(step.status);
      const isActive = step.nodeId === execution.currentNodeId;

      overlays.set(step.nodeId, {
        nodeId: step.nodeId,
        status,
        progress: undefined,
        durationMs: step.latencyMs,
        error: step.error,
        isActive,
        attempt: 1,
      });
    }

    return overlays;
  }, [execution]);
}

export function useNodeExecutionStatus(
  execution: ExecutionTrace | null,
  nodeId: string
): NodeExecutionOverlay | null {
  return useMemo(() => {
    if (!execution) {
      return null;
    }

    const step = execution.steps.find((s) => s.nodeId === nodeId);
    if (!step) {
      return null;
    }

    const status = mapExecutionStatusToTimeline(step.status);
    const isActive = nodeId === execution.currentNodeId;

    return {
      nodeId,
      status,
      progress: undefined,
      durationMs: step.latencyMs,
      error: step.error,
      isActive,
      attempt: 1,
    };
  }, [execution, nodeId]);
}
