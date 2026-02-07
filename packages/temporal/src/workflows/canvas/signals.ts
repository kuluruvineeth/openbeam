import type { ExecutionPlan, ExecutionTrace } from "@openplane/types/canvas";
import {
  type CanvasApprovalSignalPayload,
  CanvasApprovalSignalPayloadSchema,
  type CanvasInputSignalPayload,
  CanvasInputSignalPayloadSchema,
} from "@openplane/types/temporal";
import { patched, setHandler } from "@temporalio/workflow";
import { SAFETY_CEILINGS } from "../../config/constants";
import {
  type CanvasExecutionQueryState,
  cancelSignal,
  canvasApprovalSignal,
  canvasExecutionQuery,
  canvasInputSignal,
  pauseSignal,
  resumeSignal,
} from "../types";
import type { CanvasExecutionState } from "./state";

export interface SignalMetrics {
  droppedSignals: number;
  nodeExecutionCount: number;
}

export function setupSignalHandlers(params: {
  state: CanvasExecutionState;
  executionId: string;
  approvalResponses: Map<string, CanvasApprovalSignalPayload>;
  inputResponses: Map<string, CanvasInputSignalPayload>;
  metrics: SignalMetrics;
}): void {
  const { state, executionId, approvalResponses, inputResponses, metrics } =
    params;

  if (patched("v2-signal-handlers-with-validation")) {
    setHandler(cancelSignal, () => {
      state.cancelled = true;
    });

    setHandler(pauseSignal, () => {
      if (!state.cancelled) {
        state.paused = true;
      }
    });

    setHandler(resumeSignal, () => {
      state.paused = false;
    });

    setHandler(canvasApprovalSignal, (rawPayload: unknown) => {
      const parseResult =
        CanvasApprovalSignalPayloadSchema.safeParse(rawPayload);
      if (!parseResult.success) {
        metrics.droppedSignals += 1;
        return;
      }
      const payload = parseResult.data;
      if (state.cancelled) {
        metrics.droppedSignals += 1;
        return;
      }
      if (payload.executionId && payload.executionId !== executionId) {
        metrics.droppedSignals += 1;
        return;
      }
      if (
        approvalResponses.size + inputResponses.size >=
        SAFETY_CEILINGS.MAX_SIGNAL_QUEUE_SIZE
      ) {
        metrics.droppedSignals += 1;
        return;
      }
      approvalResponses.set(payload.approvalId, payload);
    });

    setHandler(canvasInputSignal, (rawPayload: unknown) => {
      const parseResult = CanvasInputSignalPayloadSchema.safeParse(rawPayload);
      if (!parseResult.success) {
        metrics.droppedSignals += 1;
        return;
      }
      const payload = parseResult.data;
      if (state.cancelled) {
        metrics.droppedSignals += 1;
        return;
      }
      if (payload.executionId && payload.executionId !== executionId) {
        metrics.droppedSignals += 1;
        return;
      }
      if (
        approvalResponses.size + inputResponses.size >=
        SAFETY_CEILINGS.MAX_SIGNAL_QUEUE_SIZE
      ) {
        metrics.droppedSignals += 1;
        return;
      }
      inputResponses.set(payload.nodeId, payload);
    });
  } else {
    setHandler(cancelSignal, () => {
      state.cancelled = true;
    });

    setHandler(pauseSignal, () => {
      state.paused = true;
    });

    setHandler(resumeSignal, () => {
      state.paused = false;
    });

    setHandler(canvasApprovalSignal, (payload) => {
      if (payload.executionId && payload.executionId !== executionId) {
        return;
      }
      if (
        approvalResponses.size + inputResponses.size >=
        SAFETY_CEILINGS.MAX_SIGNAL_QUEUE_SIZE
      ) {
        return;
      }
      approvalResponses.set(payload.approvalId, payload);
    });

    setHandler(canvasInputSignal, (payload) => {
      if (payload.executionId && payload.executionId !== executionId) {
        return;
      }
      if (
        approvalResponses.size + inputResponses.size >=
        SAFETY_CEILINGS.MAX_SIGNAL_QUEUE_SIZE
      ) {
        return;
      }
      inputResponses.set(payload.nodeId, payload);
    });
  }
}

export function setupQueryHandlers(params: {
  executionId: string;
  trace: ExecutionTrace;
  plan: ExecutionPlan;
  state: CanvasExecutionState;
  metrics: SignalMetrics;
  continueAsNewCount: number;
}): void {
  const { executionId, trace, plan, state, metrics, continueAsNewCount } =
    params;

  if (patched("v2-query-handler-with-error-tracking")) {
    setHandler(
      canvasExecutionQuery,
      (): CanvasExecutionQueryState => ({
        executionId,
        status: trace.status,
        currentNodeId: trace.currentNodeId,
        stepsCompleted: trace.steps.filter(
          (s) => s.status === "COMPLETED" || s.status === "FAILED"
        ).length,
        stepsTotal: plan.nodes.length,
        isPaused: state.paused,
        isCancelled: state.cancelled,
        startedAt: trace.startedAt,
        droppedSignals: metrics.droppedSignals,
        totalNodeExecutions: metrics.nodeExecutionCount,
        continueAsNewCount,
        steps: trace.steps.map((s) => ({
          nodeId: s.nodeId,
          nodeType: s.nodeType,
          status: s.status,
          startedAt: s.startedAt,
          completedAt: s.completedAt,
          error: s.error,
        })),
      })
    );
  } else {
    setHandler(
      canvasExecutionQuery,
      (): CanvasExecutionQueryState => ({
        executionId,
        status: trace.status,
        currentNodeId: trace.currentNodeId,
        stepsCompleted: trace.steps.filter(
          (s) => s.status === "COMPLETED" || s.status === "FAILED"
        ).length,
        stepsTotal: plan.nodes.length,
        isPaused: state.paused,
        isCancelled: state.cancelled,
        startedAt: trace.startedAt,
        droppedSignals: metrics.droppedSignals,
        totalNodeExecutions: metrics.nodeExecutionCount,
        continueAsNewCount,
        steps: trace.steps.map((s) => ({
          nodeId: s.nodeId,
          nodeType: s.nodeType,
          status: s.status,
          startedAt: s.startedAt,
          completedAt: s.completedAt,
          error: s.error,
        })),
      })
    );
  }
}
