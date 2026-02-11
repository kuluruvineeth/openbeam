"use client";

import { useMemo } from "react";
import { AGENT_UI_CONSTANTS } from "../lib/agent-constants";

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

const EXPLORATION_TOOLS = new Set([
  "Read",
  "Grep",
  "Glob",
  "Task",
  "WebFetch",
  "WebSearch",
  "mcp__",
]);

function isExplorationTool(toolName: string): boolean {
  if (EXPLORATION_TOOLS.has(toolName)) {
    return true;
  }
  return Array.from(EXPLORATION_TOOLS).some(
    (prefix) => prefix.endsWith("__") && toolName.startsWith(prefix)
  );
}

function isToolCallEvent(event: AgentEvent): event is ToolCallEvent {
  return event.type === "tool_call";
}

function isToolResultEvent(event: AgentEvent): event is ToolResultEvent {
  return event.type === "tool_result";
}

function isCanvasStatusEvent(event: AgentEvent): boolean {
  return event.type === "status" && event.status === "canvas_tool";
}

type GroupedEventItem =
  | { type: "single"; event: AgentEvent }
  | { type: "group"; groupId: string; events: AgentEvent[]; label: string }
  | { type: "canvas_progress"; groupId: string; events: AgentEvent[] };

interface EventGroup {
  id: string;
  events: AgentEvent[];
  toolNames: string[];
  status: "pending" | "running" | "completed" | "error";
  label: string;
}

interface UseEventGroupingReturn {
  groupedItems: GroupedEventItem[];
  groups: EventGroup[];
  ungroupedEvents: AgentEvent[];
}

function getGroupStatus(events: AgentEvent[]): EventGroup["status"] {
  const hasError = events.some((e) => isToolResultEvent(e) && !e.success);
  if (hasError) {
    return "error";
  }

  const callEvents = events.filter(isToolCallEvent);
  const allComplete = callEvents.every((callEvent) =>
    events.some(
      (e) => isToolResultEvent(e) && e.toolCallId === callEvent.toolCallId
    )
  );
  if (allComplete) {
    return "completed";
  }

  return "running";
}

function createEventGroup(
  eventList: AgentEvent[],
  groupIndex: number
): EventGroup {
  const groupId = `group-${groupIndex}`;
  const toolNames = eventList.filter(isToolCallEvent).map((e) => e.toolName);

  return {
    id: groupId,
    events: [...eventList],
    toolNames: [...new Set(toolNames)],
    status: getGroupStatus(eventList),
    label: "Exploration",
  };
}

interface GroupingState {
  groupedItems: GroupedEventItem[];
  groups: EventGroup[];
  ungroupedEvents: AgentEvent[];
  currentGroupEvents: AgentEvent[];
  currentCanvasStatusEvents: AgentEvent[];
  groupIndex: number;
}

function addSingleEvent(state: GroupingState, event: AgentEvent): void {
  state.ungroupedEvents.push(event);
  state.groupedItems.push({ type: "single", event });
}

function flushCurrentGroup(state: GroupingState, minGroupSize: number): void {
  const { currentGroupEvents } = state;
  if (currentGroupEvents.length === 0) {
    return;
  }

  if (currentGroupEvents.length >= minGroupSize) {
    state.groupIndex += 1;
    const group = createEventGroup(currentGroupEvents, state.groupIndex);
    state.groups.push(group);
    state.groupedItems.push({
      type: "group",
      groupId: group.id,
      events: group.events,
      label: group.label,
    });
  } else {
    for (const event of currentGroupEvents) {
      addSingleEvent(state, event);
    }
  }
  state.currentGroupEvents = [];
}

const MIN_CANVAS_STATUS_GROUP_SIZE = 1;

function flushCanvasStatusGroup(state: GroupingState): void {
  const { currentCanvasStatusEvents } = state;
  if (currentCanvasStatusEvents.length === 0) {
    return;
  }

  if (currentCanvasStatusEvents.length >= MIN_CANVAS_STATUS_GROUP_SIZE) {
    state.groupIndex += 1;
    state.groupedItems.push({
      type: "canvas_progress",
      groupId: `canvas-progress-${state.groupIndex}`,
      events: [...currentCanvasStatusEvents],
    });
  } else {
    for (const event of currentCanvasStatusEvents) {
      addSingleEvent(state, event);
    }
  }
  state.currentCanvasStatusEvents = [];
}

function processToolCallEvent(
  state: GroupingState,
  event: ToolCallEvent,
  minGroupSize: number
): void {
  if (isExplorationTool(event.toolName)) {
    state.currentGroupEvents.push(event);
  } else {
    flushCurrentGroup(state, minGroupSize);
    addSingleEvent(state, event);
  }
}

function processToolResultEvent(
  state: GroupingState,
  event: ToolResultEvent
): void {
  const matchingCall = state.currentGroupEvents.find(
    (e) => isToolCallEvent(e) && e.toolCallId === event.toolCallId
  );
  if (matchingCall) {
    state.currentGroupEvents.push(event);
  } else {
    addSingleEvent(state, event);
  }
}

function groupEvents(
  events: AgentEvent[],
  minGroupSize: number
): UseEventGroupingReturn {
  const state: GroupingState = {
    groupedItems: [],
    groups: [],
    ungroupedEvents: [],
    currentGroupEvents: [],
    currentCanvasStatusEvents: [],
    groupIndex: 0,
  };

  for (const event of events) {
    if (isToolCallEvent(event)) {
      flushCanvasStatusGroup(state);
      processToolCallEvent(state, event, minGroupSize);
    } else if (isToolResultEvent(event)) {
      flushCanvasStatusGroup(state);
      processToolResultEvent(state, event);
    } else if (isCanvasStatusEvent(event)) {
      flushCurrentGroup(state, minGroupSize);
      state.currentCanvasStatusEvents.push(event);
    } else {
      flushCurrentGroup(state, minGroupSize);
      flushCanvasStatusGroup(state);
      addSingleEvent(state, event);
    }
  }

  flushCurrentGroup(state, minGroupSize);
  flushCanvasStatusGroup(state);

  return {
    groupedItems: state.groupedItems,
    groups: state.groups,
    ungroupedEvents: state.ungroupedEvents,
  };
}

function useEventGrouping(
  events: AgentEvent[],
  minGroupSize: number = AGENT_UI_CONSTANTS.MIN_GROUP_SIZE
): UseEventGroupingReturn {
  return useMemo(
    () => groupEvents(events, minGroupSize),
    [events, minGroupSize]
  );
}

export {
  groupEvents,
  useEventGrouping,
  isExplorationTool,
  isCanvasStatusEvent,
  EXPLORATION_TOOLS,
};
export type {
  AgentEvent,
  GroupedEventItem,
  EventGroup,
  UseEventGroupingReturn,
};
