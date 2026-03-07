import type { ExecutionTrace } from "@openbeam/types/canvas";
import type {
  CanvasApprovalSignalPayload,
  CanvasInputSignalPayload,
  LoopState,
} from "@openbeam/types/temporal";
import type { CanvasExecutionCheckpoint } from "@openbeam/types/temporal/workflows";

export interface CanvasExecutionState {
  paused: boolean;
  cancelled: boolean;
}

export function createCheckpoint(params: {
  trace: ExecutionTrace;
  approvalResponses: Map<string, CanvasApprovalSignalPayload>;
  inputResponses: Map<string, CanvasInputSignalPayload>;
  loopStates: Map<string, unknown>;
  loopStack: string[];
  continueAsNewCount: number;
  currentPayload?: unknown;
  lastStepOutput?: unknown;
  nextNodeId?: string | null;
}): CanvasExecutionCheckpoint {
  return {
    currentNodeId: params.nextNodeId ?? params.trace.currentNodeId ?? null,
    currentPayload: params.currentPayload,
    lastStepOutput: params.lastStepOutput,
    traceSnapshot: {
      id: params.trace.id,
      status: params.trace.status,
      stepsCount: params.trace.steps.length,
      totalLatencyMs: params.trace.totalLatencyMs ?? 0,
    },
    approvalResponses: Array.from(params.approvalResponses.entries()),
    inputResponses: Array.from(params.inputResponses.entries()),
    loopStates: Array.from(params.loopStates.entries()),
    loopStack: [...params.loopStack],
    continueAsNewCount: params.continueAsNewCount + 1,
  };
}

export function restoreFromCheckpoint(
  checkpoint: CanvasExecutionCheckpoint,
  approvalResponses: Map<string, CanvasApprovalSignalPayload>,
  inputResponses: Map<string, CanvasInputSignalPayload>
): { loopStates: Map<string, LoopState>; loopStack: string[] } {
  if (checkpoint.approvalResponses) {
    for (const [key, value] of checkpoint.approvalResponses) {
      approvalResponses.set(key, value as CanvasApprovalSignalPayload);
    }
  }
  if (checkpoint.inputResponses) {
    for (const [key, value] of checkpoint.inputResponses) {
      inputResponses.set(key, value as CanvasInputSignalPayload);
    }
  }

  const loopStates = new Map<string, LoopState>();
  if (checkpoint.loopStates) {
    for (const [key, value] of checkpoint.loopStates) {
      loopStates.set(key, value as LoopState);
    }
  }

  const loopStack = checkpoint.loopStack ? [...checkpoint.loopStack] : [];

  return { loopStates, loopStack };
}
