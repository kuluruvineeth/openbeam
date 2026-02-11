import type { ExecutionEvent } from "@openplane/types/canvas";
import { useExecutionStore } from "./execution-store";

export function dispatchExecutionEvent(event: ExecutionEvent): void {
  const store = useExecutionStore.getState();

  switch (event.type) {
    case "execution.started":
      store.startExecution({
        id: event.executionId,
        agentCanvasId: event.agentCanvasId,
        status: "RUNNING",
        steps: [],
        startedAt: event.timestamp,
      });
      break;

    case "execution.progress":
      if (event.currentNodeId) {
        store.updateExecution({ currentNodeId: event.currentNodeId });
      }
      break;

    case "execution.completed":
      store.completeExecution(event.status, event.output);
      break;

    case "execution.failed":
      store.completeExecution("FAILED", undefined, event.error);
      break;

    case "execution.cancelled":
      store.completeExecution("CANCELLED");
      break;

    case "step.started":
      store.addStep({
        nodeId: event.nodeId,
        nodeType: event.nodeType,
        status: "RUNNING",
        startedAt: event.timestamp,
      });
      break;

    case "step.progress":
      store.updateStep(event.nodeId, {});
      break;

    case "step.completed":
      store.updateStep(event.nodeId, {
        status: "COMPLETED",
        output: event.output,
        completedAt: event.timestamp,
        latencyMs: event.durationMs,
        tokenUsage: event.tokenUsage,
      });
      break;

    case "step.failed":
      store.updateStep(event.nodeId, {
        status: "FAILED",
        error: event.error,
      });
      break;

    case "step.skipped":
      store.addStep({
        nodeId: event.nodeId,
        nodeType: "",
        status: "COMPLETED",
        startedAt: event.timestamp,
        completedAt: event.timestamp,
      });
      break;

    case "step.retrying":
      store.updateStep(event.nodeId, { status: "PENDING" });
      break;

    case "approval.requested":
      store.updateExecution({
        status: "WAITING_APPROVAL",
        currentNodeId: event.nodeId,
      });
      break;

    case "approval.received":
      store.updateExecution({ status: "RUNNING" });
      break;

    case "input.requested":
      store.updateExecution({
        status: "WAITING_INPUT",
        currentNodeId: event.nodeId,
      });
      break;

    case "input.received":
      store.updateExecution({ status: "RUNNING" });
      break;

    case "heartbeat":
    case "connected":
    case "disconnected":
      break;

    default:
      break;
  }
}
