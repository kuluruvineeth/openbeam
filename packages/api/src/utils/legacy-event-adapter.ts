import type { ExecutionEvent } from "@openbeam/types/canvas/execution-events";
import type { RuntimeEvent } from "@openbeam/types/canvas/runtime-events";

export function runtimeEventToExecutionEvent(
  event: RuntimeEvent
): ExecutionEvent | null {
  const { payload } = event;

  switch (payload.type) {
    case "execution.started":
      return {
        type: "execution.started",
        executionId: payload.executionId,
        agentCanvasId: event.canvasId,
        timestamp: event.timestamp,
      };

    case "execution.progress":
      return {
        type: "execution.progress",
        executionId: payload.executionId,
        currentNodeId: payload.nodeId,
        stepsCompleted: 0,
        stepsTotal: 0,
        timestamp: event.timestamp,
      };

    case "execution.completed":
      return {
        type: "execution.completed",
        executionId: payload.executionId,
        status: payload.status,
        durationMs: payload.durationMs ?? 0,
        timestamp: event.timestamp,
      };

    case "execution.failed":
      return {
        type: "execution.failed",
        executionId: payload.executionId,
        error: payload.error,
        timestamp: event.timestamp,
      };

    default:
      return null;
  }
}
