"use client";

import type { ExecutionStatus } from "@openbeam/types/canvas/execution";
import type {
  RuntimeEvent,
  RuntimeEventPayload,
} from "@openbeam/types/canvas/runtime-events";
import type {
  TimelineData,
  TimelineEvent,
  TimelineEventType,
  TimelineStep,
  TimelineStepStatus,
} from "@openbeam/types/canvas/timeline";
import { useMemo } from "react";

type ToolCallStartPayload = Extract<
  RuntimeEventPayload,
  { type: "tool.call_start" }
>;
type ToolCallResultPayload = Extract<
  RuntimeEventPayload,
  { type: "tool.call_result" }
>;
type ExecutionProgressPayload = Extract<
  RuntimeEventPayload,
  { type: "execution.progress" }
>;
type ExecutionCompletedPayload = Extract<
  RuntimeEventPayload,
  { type: "execution.completed" }
>;
type ExecutionFailedPayload = Extract<
  RuntimeEventPayload,
  { type: "execution.failed" }
>;

function filterByExecution(
  events: RuntimeEvent[],
  executionId: string
): RuntimeEvent[] {
  return events.filter((event) => event.executionId === executionId);
}

function sortBySequence(events: RuntimeEvent[]): RuntimeEvent[] {
  return [...events].sort((a, b) => a.sequence - b.sequence);
}

function resolveStepId(event: RuntimeEvent): string {
  return event.stepId ?? event.toolCallId ?? event.eventId;
}

function deriveExecutionStatus(events: RuntimeEvent[]): ExecutionStatus {
  for (let i = events.length - 1; i >= 0; i--) {
    const event = events[i];
    if (!event) {
      continue;
    }
    const { payload } = event;
    if (payload.type === "execution.completed") {
      return (payload as ExecutionCompletedPayload).status;
    }
    if (payload.type === "execution.failed") {
      return "FAILED";
    }
  }

  const hasStarted = events.some((e) => e.payload.type === "execution.started");
  return hasStarted ? "RUNNING" : "PENDING";
}

function findStartTimestamp(events: RuntimeEvent[]): number {
  const startEvent = events.find((e) => e.payload.type === "execution.started");
  return startEvent?.timestamp ?? events[0]?.timestamp ?? Date.now();
}

function findCompletionTimestamp(events: RuntimeEvent[]): number | undefined {
  for (let i = events.length - 1; i >= 0; i--) {
    const event = events[i];
    if (!event) {
      continue;
    }
    if (
      event.payload.type === "execution.completed" ||
      event.payload.type === "execution.failed"
    ) {
      return event.timestamp;
    }
  }
  return;
}

function buildStepsFromToolCalls(
  events: RuntimeEvent[]
): Map<string, TimelineStep> {
  const steps = new Map<string, TimelineStep>();

  for (const event of events) {
    const payload = event.payload;

    if (payload.type === "tool.call_start") {
      const toolPayload = payload as ToolCallStartPayload;
      const stepId = resolveStepId(event);

      steps.set(stepId, {
        id: stepId,
        nodeId: event.toolCallId ?? toolPayload.toolCallId,
        nodeType: toolPayload.toolName,
        nodeName: toolPayload.displayName ?? toolPayload.toolName,
        status: "running" as TimelineStepStatus,
        startedAt: event.timestamp,
        input: toolPayload.toolInput,
        retryCount: 0,
        attempt: 1,
        depth: 0,
      });
    }

    if (payload.type === "tool.call_result") {
      const resultPayload = payload as ToolCallResultPayload;
      const stepId =
        event.stepId ?? event.toolCallId ?? resultPayload.toolCallId;
      const existing = steps.get(stepId);

      if (existing) {
        const completedStatus: TimelineStepStatus = resultPayload.success
          ? "success"
          : "error";
        steps.set(stepId, {
          ...existing,
          status: completedStatus,
          completedAt: event.timestamp,
          durationMs:
            resultPayload.durationMs ??
            (existing.startedAt
              ? event.timestamp - existing.startedAt
              : undefined),
          output: resultPayload.toolOutput,
          error: resultPayload.success ? undefined : "Tool call failed",
        });
      }
    }
  }

  return steps;
}

function mapPayloadToTimelineEventType(
  payloadType: RuntimeEventPayload["type"]
): TimelineEventType | null {
  const mapping: Partial<
    Record<RuntimeEventPayload["type"], TimelineEventType>
  > = {
    "execution.started": "execution_started",
    "execution.completed": "execution_completed",
    "execution.failed": "execution_failed",
    "execution.progress": "execution_started",
    "tool.call_start": "step_started",
    "tool.call_result": "step_completed",
  };
  return mapping[payloadType] ?? null;
}

function buildTimelineEvents(events: RuntimeEvent[]): TimelineEvent[] {
  const timelineEvents: TimelineEvent[] = [];

  for (const event of events) {
    const eventType = mapPayloadToTimelineEventType(event.payload.type);
    if (!eventType) {
      continue;
    }

    const timelineEvent: TimelineEvent = {
      id: event.eventId,
      type: eventType,
      timestamp: event.timestamp,
      stepId: event.stepId ?? event.toolCallId,
      nodeId: extractNodeId(event),
      message: buildEventMessage(event),
      metadata: buildEventMetadata(event),
    };

    if (
      event.payload.type === "tool.call_result" &&
      !(event.payload as ToolCallResultPayload).success
    ) {
      timelineEvent.type = "step_failed";
    }

    timelineEvents.push(timelineEvent);
  }

  return timelineEvents;
}

function extractNodeId(event: RuntimeEvent): string | undefined {
  const payload = event.payload;
  if (
    payload.type === "execution.progress" &&
    (payload as ExecutionProgressPayload).nodeId
  ) {
    return (payload as ExecutionProgressPayload).nodeId;
  }
  if (
    payload.type === "tool.call_start" ||
    payload.type === "tool.call_result"
  ) {
    return event.toolCallId ?? (payload as ToolCallStartPayload).toolCallId;
  }
  return;
}

function buildEventMessage(event: RuntimeEvent): string {
  const payload = event.payload;
  switch (payload.type) {
    case "execution.started":
      return "Execution started";
    case "execution.progress":
      return (payload as ExecutionProgressPayload).message ?? "In progress";
    case "execution.completed":
      return `Execution ${(payload as ExecutionCompletedPayload).status.toLowerCase()}`;
    case "execution.failed":
      return (payload as ExecutionFailedPayload).error;
    case "tool.call_start":
      return `Started: ${(payload as ToolCallStartPayload).displayName ?? (payload as ToolCallStartPayload).toolName}`;
    case "tool.call_result":
      return (payload as ToolCallResultPayload).success
        ? `Completed: ${(payload as ToolCallResultPayload).toolName}`
        : `Failed: ${(payload as ToolCallResultPayload).toolName}`;
    default:
      return "";
  }
}

function buildEventMetadata(
  event: RuntimeEvent
): Record<string, unknown> | undefined {
  const payload = event.payload;
  if (payload.type === "execution.completed") {
    const completed = payload as ExecutionCompletedPayload;
    return completed.durationMs
      ? { durationMs: completed.durationMs }
      : undefined;
  }
  if (payload.type === "execution.failed") {
    const failed = payload as ExecutionFailedPayload;
    return failed.retryable !== undefined
      ? { retryable: failed.retryable }
      : undefined;
  }
  return;
}

function computeProgress(steps: TimelineStep[]): TimelineData["progress"] {
  const completed = steps.filter(
    (s) =>
      s.status === "success" || s.status === "error" || s.status === "skipped"
  ).length;
  const total = steps.length;
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

  return { completed, total, percentage };
}

function projectRuntimeEventsToTimeline(
  events: RuntimeEvent[],
  executionId: string
): TimelineData | null {
  const filtered = filterByExecution(events, executionId);
  if (filtered.length === 0) {
    return null;
  }

  const sorted = sortBySequence(filtered);
  const status = deriveExecutionStatus(sorted);
  const startedAt = findStartTimestamp(sorted);
  const completedAt = findCompletionTimestamp(sorted);
  const stepsMap = buildStepsFromToolCalls(sorted);
  const steps = Array.from(stepsMap.values()).sort(
    (a, b) => (a.startedAt ?? 0) - (b.startedAt ?? 0)
  );
  const timelineEvents = buildTimelineEvents(sorted);
  const progress = computeProgress(steps);
  const totalDurationMs =
    completedAt !== undefined ? completedAt - startedAt : undefined;

  return {
    executionId,
    status,
    steps,
    events: timelineEvents,
    startedAt,
    completedAt,
    totalDurationMs,
    progress,
  };
}

function useRuntimeTimeline(
  events: RuntimeEvent[],
  executionId: string | null
): TimelineData | null {
  return useMemo(() => {
    if (!executionId) {
      return null;
    }
    return projectRuntimeEventsToTimeline(events, executionId);
  }, [events, executionId]);
}

export { projectRuntimeEventsToTimeline, useRuntimeTimeline };
