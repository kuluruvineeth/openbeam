"use client";

import { useMemo } from "react";

interface ToolCallEvent {
  type: "tool_call";
  timestamp: number;
  toolCallId: string;
  toolName: string;
  displayName: string;
  toolInput?: unknown;
  visibility: "visible" | "ephemeral" | "hidden";
}

interface ToolResultEvent {
  type: "tool_result";
  timestamp: number;
  toolCallId: string;
  toolName: string;
  toolOutput?: unknown;
  durationMs?: number;
  success: boolean;
}

type AgentEvent =
  | { type: "thinking"; timestamp: number; message: string }
  | { type: "status"; timestamp: number; status: string; message: string }
  | ToolCallEvent
  | ToolResultEvent
  | { type: "text"; timestamp: number; content: string; isPartial: boolean }
  | {
      type: "error";
      timestamp: number;
      code: string;
      message: string;
      retryable: boolean;
    }
  | { type: "done"; timestamp: number; success: boolean };

type ToolStepStatus = "pending" | "running" | "success" | "error";

interface ToolStep {
  id: string;
  toolCallId: string;
  toolName: string;
  displayName: string;
  status: ToolStepStatus;
  input?: unknown;
  output?: unknown;
  durationMs?: number;
  startedAt: number;
  completedAt?: number;
  visibility: "visible" | "ephemeral" | "hidden";
}

interface UseToolStepsReturn {
  steps: ToolStep[];
  pendingCount: number;
  runningCount: number;
  successCount: number;
  errorCount: number;
  totalDurationMs: number;
  isComplete: boolean;
}

function isToolCallEvent(event: AgentEvent): event is ToolCallEvent {
  return event.type === "tool_call";
}

function isToolResultEvent(event: AgentEvent): event is ToolResultEvent {
  return event.type === "tool_result";
}

function partitionToolEvents(events: AgentEvent[]): {
  toolCalls: Map<string, ToolCallEvent>;
  toolResults: Map<string, ToolResultEvent>;
} {
  const toolCalls = new Map<string, ToolCallEvent>();
  const toolResults = new Map<string, ToolResultEvent>();

  for (const event of events) {
    if (isToolCallEvent(event)) {
      toolCalls.set(event.toolCallId, event);
    } else if (isToolResultEvent(event)) {
      toolResults.set(event.toolCallId, event);
    }
  }

  return { toolCalls, toolResults };
}

function determineStepStatus(
  toolCallId: string,
  resultEvent: ToolResultEvent | undefined,
  events: AgentEvent[]
): ToolStepStatus {
  if (resultEvent) {
    return resultEvent.success ? "success" : "error";
  }

  const callIndex = events.findIndex(
    (e) => isToolCallEvent(e) && e.toolCallId === toolCallId
  );
  const hasLaterEvents = events
    .slice(callIndex + 1)
    .some((e) => !isToolResultEvent(e) || e.toolCallId !== toolCallId);

  return hasLaterEvents ? "running" : "pending";
}

function createToolStep(
  callEvent: ToolCallEvent,
  resultEvent: ToolResultEvent | undefined,
  events: AgentEvent[]
): ToolStep {
  return {
    id: callEvent.toolCallId,
    toolCallId: callEvent.toolCallId,
    toolName: callEvent.toolName,
    displayName: callEvent.displayName,
    status: determineStepStatus(callEvent.toolCallId, resultEvent, events),
    input: callEvent.toolInput,
    output: resultEvent?.toolOutput,
    durationMs: resultEvent?.durationMs,
    startedAt: callEvent.timestamp,
    completedAt: resultEvent?.timestamp,
    visibility: callEvent.visibility,
  };
}

function buildSteps(
  toolCalls: Map<string, ToolCallEvent>,
  toolResults: Map<string, ToolResultEvent>,
  events: AgentEvent[]
): ToolStep[] {
  const steps: ToolStep[] = [];

  for (const [toolCallId, callEvent] of toolCalls) {
    const resultEvent = toolResults.get(toolCallId);
    steps.push(createToolStep(callEvent, resultEvent, events));
  }

  steps.sort((a, b) => a.startedAt - b.startedAt);
  return steps;
}

function computeStepStats(
  steps: ToolStep[]
): Omit<UseToolStepsReturn, "steps"> {
  const pendingCount = steps.filter((s) => s.status === "pending").length;
  const runningCount = steps.filter((s) => s.status === "running").length;
  const successCount = steps.filter((s) => s.status === "success").length;
  const errorCount = steps.filter((s) => s.status === "error").length;
  const totalDurationMs = steps.reduce(
    (sum, step) => sum + (step.durationMs ?? 0),
    0
  );
  const isComplete =
    steps.length > 0 && pendingCount === 0 && runningCount === 0;

  return {
    pendingCount,
    runningCount,
    successCount,
    errorCount,
    totalDurationMs,
    isComplete,
  };
}

function processToolSteps(events: AgentEvent[]): UseToolStepsReturn {
  const { toolCalls, toolResults } = partitionToolEvents(events);
  const steps = buildSteps(toolCalls, toolResults, events);
  const stats = computeStepStats(steps);

  return { steps, ...stats };
}

function useToolSteps(events: AgentEvent[]): UseToolStepsReturn {
  return useMemo(() => processToolSteps(events), [events]);
}

export { useToolSteps };
export type { AgentEvent, ToolStep, ToolStepStatus, UseToolStepsReturn };
