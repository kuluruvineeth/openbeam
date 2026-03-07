"use client";

import type { ExecutionEvent } from "@openbeam/types/canvas/execution-events";
import type {
  TimelineData,
  TimelineEvent,
  TimelineStep,
  TimelineStepStatus,
} from "@openbeam/types/canvas/timeline";
import { useCallback, useMemo, useReducer } from "react";

type StepStatusMap = Record<string, TimelineStep>;

interface TimelineState {
  executionId: string | null;
  status: TimelineData["status"];
  steps: StepStatusMap;
  events: TimelineEvent[];
  startedAt: number | null;
  completedAt: number | null;
  currentNodeId: string | null;
  stepsCompleted: number;
  stepsTotal: number;
}

type TimelineAction =
  | { type: "RESET"; executionId: string }
  | { type: "EXECUTION_STARTED"; timestamp: number }
  | {
      type: "EXECUTION_PROGRESS";
      currentNodeId?: string;
      completed: number;
      total: number;
    }
  | {
      type: "EXECUTION_COMPLETED";
      status: TimelineData["status"];
      timestamp: number;
      durationMs: number;
    }
  | { type: "EXECUTION_FAILED"; error: string; timestamp: number }
  | {
      type: "STEP_STARTED";
      step: Omit<TimelineStep, "status" | "durationMs">;
      timestamp: number;
    }
  | {
      type: "STEP_PROGRESS";
      stepId: string;
      nodeId: string;
      progress: number;
      message?: string;
    }
  | {
      type: "STEP_COMPLETED";
      stepId: string;
      nodeId: string;
      durationMs: number;
      timestamp: number;
      output?: unknown;
    }
  | {
      type: "STEP_FAILED";
      stepId: string;
      nodeId: string;
      error: string;
      timestamp: number;
    }
  | { type: "STEP_SKIPPED"; stepId: string; nodeId: string; timestamp: number }
  | {
      type: "STEP_RETRYING";
      stepId: string;
      nodeId: string;
      attempt: number;
      maxAttempts: number;
      timestamp: number;
    }
  | { type: "ADD_EVENT"; event: TimelineEvent };

const initialState: TimelineState = {
  executionId: null,
  status: "PENDING",
  steps: {},
  events: [],
  startedAt: null,
  completedAt: null,
  currentNodeId: null,
  stepsCompleted: 0,
  stepsTotal: 0,
};

function timelineReducer(
  state: TimelineState,
  action: TimelineAction
): TimelineState {
  switch (action.type) {
    case "RESET":
      return { ...initialState, executionId: action.executionId };

    case "EXECUTION_STARTED":
      return {
        ...state,
        status: "RUNNING",
        startedAt: action.timestamp,
      };

    case "EXECUTION_PROGRESS":
      return {
        ...state,
        currentNodeId: action.currentNodeId ?? state.currentNodeId,
        stepsCompleted: action.completed,
        stepsTotal: action.total,
      };

    case "EXECUTION_COMPLETED":
      return {
        ...state,
        status: action.status,
        completedAt: action.timestamp,
      };

    case "EXECUTION_FAILED":
      return {
        ...state,
        status: "FAILED",
        completedAt: action.timestamp,
      };

    case "STEP_STARTED": {
      const step: TimelineStep = {
        ...action.step,
        status: "running",
        startedAt: action.timestamp,
      };
      return {
        ...state,
        currentNodeId: action.step.nodeId,
        steps: { ...state.steps, [action.step.id]: step },
      };
    }

    case "STEP_PROGRESS": {
      const existing = state.steps[action.stepId];
      if (!existing) {
        return state;
      }
      return {
        ...state,
        steps: {
          ...state.steps,
          [action.stepId]: { ...existing },
        },
      };
    }

    case "STEP_COMPLETED": {
      const existing = state.steps[action.stepId];
      if (!existing) {
        return state;
      }
      return {
        ...state,
        steps: {
          ...state.steps,
          [action.stepId]: {
            ...existing,
            status: "success" as TimelineStepStatus,
            completedAt: action.timestamp,
            durationMs: action.durationMs,
          },
        },
      };
    }

    case "STEP_FAILED": {
      const existing = state.steps[action.stepId];
      if (!existing) {
        return state;
      }
      return {
        ...state,
        steps: {
          ...state.steps,
          [action.stepId]: {
            ...existing,
            status: "error" as TimelineStepStatus,
            completedAt: action.timestamp,
            error: action.error,
          },
        },
      };
    }

    case "STEP_SKIPPED": {
      const existing = state.steps[action.stepId];
      if (!existing) {
        return state;
      }
      return {
        ...state,
        steps: {
          ...state.steps,
          [action.stepId]: {
            ...existing,
            status: "skipped" as TimelineStepStatus,
            completedAt: action.timestamp,
          },
        },
      };
    }

    case "STEP_RETRYING": {
      const existing = state.steps[action.stepId];
      if (!existing) {
        return state;
      }
      return {
        ...state,
        steps: {
          ...state.steps,
          [action.stepId]: {
            ...existing,
            retryCount: action.attempt - 1,
            attempt: action.attempt,
          },
        },
      };
    }

    case "ADD_EVENT":
      return {
        ...state,
        events: [...state.events, action.event],
      };

    default:
      return state;
  }
}

interface UseExecutionTimelineStateOptions {
  executionId: string;
}

interface UseExecutionTimelineStateReturn {
  state: TimelineState;
  timelineData: TimelineData;
  processEvent: (event: ExecutionEvent) => void;
  reset: () => void;
}

export function useExecutionTimelineState({
  executionId,
}: UseExecutionTimelineStateOptions): UseExecutionTimelineStateReturn {
  const [state, dispatch] = useReducer(timelineReducer, {
    ...initialState,
    executionId,
  });

  const processEvent = useCallback((event: ExecutionEvent) => {
    const timelineEvent: TimelineEvent = {
      id: `${event.type}-${event.timestamp}`,
      type: mapEventType(event.type),
      message: getEventMessage(event),
      timestamp: event.timestamp,
      nodeId: "nodeId" in event ? event.nodeId : undefined,
      stepId: "stepId" in event ? event.stepId : undefined,
    };
    dispatch({ type: "ADD_EVENT", event: timelineEvent });

    switch (event.type) {
      case "execution.started":
        dispatch({ type: "EXECUTION_STARTED", timestamp: event.timestamp });
        break;

      case "execution.progress":
        dispatch({
          type: "EXECUTION_PROGRESS",
          currentNodeId: event.currentNodeId,
          completed: event.stepsCompleted,
          total: event.stepsTotal,
        });
        break;

      case "execution.completed":
        dispatch({
          type: "EXECUTION_COMPLETED",
          status: event.status,
          timestamp: event.timestamp,
          durationMs: event.durationMs,
        });
        break;

      case "execution.failed":
        dispatch({
          type: "EXECUTION_FAILED",
          error: event.error,
          timestamp: event.timestamp,
        });
        break;

      case "step.started":
        dispatch({
          type: "STEP_STARTED",
          step: {
            id: event.stepId,
            nodeId: event.nodeId,
            nodeType: event.nodeType,
            nodeName: event.nodeName,
            attempt: event.attempt,
            retryCount: 0,
            depth: 0,
          },
          timestamp: event.timestamp,
        });
        break;

      case "step.progress":
        dispatch({
          type: "STEP_PROGRESS",
          stepId: event.stepId,
          nodeId: event.nodeId,
          progress: event.progress,
          message: event.message,
        });
        break;

      case "step.completed":
        dispatch({
          type: "STEP_COMPLETED",
          stepId: event.stepId,
          nodeId: event.nodeId,
          durationMs: event.durationMs,
          timestamp: event.timestamp,
          output: event.output,
        });
        break;

      case "step.failed":
        dispatch({
          type: "STEP_FAILED",
          stepId: event.stepId,
          nodeId: event.nodeId,
          error: event.error,
          timestamp: event.timestamp,
        });
        break;

      case "step.skipped":
        dispatch({
          type: "STEP_SKIPPED",
          stepId: event.stepId,
          nodeId: event.nodeId,
          timestamp: event.timestamp,
        });
        break;

      case "step.retrying":
        dispatch({
          type: "STEP_RETRYING",
          stepId: event.stepId,
          nodeId: event.nodeId,
          attempt: event.attempt,
          maxAttempts: event.maxAttempts,
          timestamp: event.timestamp,
        });
        break;

      case "execution.cancelled":
        dispatch({
          type: "EXECUTION_COMPLETED",
          status: "CANCELLED",
          timestamp: event.timestamp,
          durationMs: 0,
        });
        break;

      default:
        break;
    }
  }, []);

  const reset = useCallback(() => {
    dispatch({ type: "RESET", executionId });
  }, [executionId]);

  const timelineData: TimelineData = useMemo(() => {
    const steps = Object.values(state.steps);
    const completed = steps.filter(
      (s) =>
        s.status === "success" || s.status === "error" || s.status === "skipped"
    ).length;
    const total = state.stepsTotal || steps.length;

    return {
      executionId: state.executionId ?? executionId,
      status: state.status,
      steps,
      events: state.events,
      startedAt: state.startedAt ?? Date.now(),
      completedAt: state.completedAt ?? undefined,
      totalDurationMs:
        state.completedAt && state.startedAt
          ? state.completedAt - state.startedAt
          : undefined,
      progress: {
        completed,
        total,
        percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
      },
    };
  }, [state, executionId]);

  return { state, timelineData, processEvent, reset };
}

function mapEventType(type: ExecutionEvent["type"]): TimelineEvent["type"] {
  const mapping: Record<ExecutionEvent["type"], TimelineEvent["type"]> = {
    "execution.started": "execution_started",
    "execution.progress": "execution_started",
    "execution.completed": "execution_completed",
    "execution.failed": "execution_failed",
    "execution.cancelled": "execution_cancelled",
    "step.started": "step_started",
    "step.progress": "step_started",
    "step.completed": "step_completed",
    "step.failed": "step_failed",
    "step.skipped": "step_skipped",
    "step.retrying": "step_retrying",
    "approval.requested": "approval_requested",
    "approval.received": "approval_received",
    "input.requested": "input_requested",
    "input.received": "input_received",
    heartbeat: "execution_started",
    connected: "execution_started",
    disconnected: "execution_failed",
  };
  return mapping[type];
}

function getEventMessage(event: ExecutionEvent): string {
  switch (event.type) {
    case "execution.started":
      return "Execution started";
    case "execution.progress":
      return `Progress: ${event.stepsCompleted}/${event.stepsTotal}`;
    case "execution.completed":
      return `Execution ${event.status.toLowerCase()}`;
    case "execution.failed":
      return `Execution failed: ${event.error}`;
    case "execution.cancelled":
      return `Execution cancelled${event.reason ? `: ${event.reason}` : ""}`;
    case "step.started":
      return `Started: ${event.nodeName}`;
    case "step.progress":
      return event.message ?? `Progress: ${event.progress}%`;
    case "step.completed":
      return `Completed: ${event.nodeId}`;
    case "step.failed":
      return `Failed: ${event.error}`;
    case "step.skipped":
      return `Skipped: ${event.nodeId}${event.reason ? ` (${event.reason})` : ""}`;
    case "step.retrying":
      return `Retrying (${event.attempt}/${event.maxAttempts})`;
    case "approval.requested":
      return `Approval requested: ${event.message ?? "Waiting for approval"}`;
    case "approval.received":
      return `Approval ${event.approved ? "granted" : "denied"}`;
    case "input.requested":
      return `Input requested: ${event.prompt ?? "Waiting for input"}`;
    case "input.received":
      return `Input received from ${event.providedByName ?? "user"}`;
    case "heartbeat":
      return "Heartbeat";
    case "connected":
      return "Connected to execution stream";
    case "disconnected":
      return `Disconnected${event.reason ? `: ${event.reason}` : ""}`;
    default:
      return "Unknown event";
  }
}

export type {
  UseExecutionTimelineStateOptions,
  UseExecutionTimelineStateReturn,
};
