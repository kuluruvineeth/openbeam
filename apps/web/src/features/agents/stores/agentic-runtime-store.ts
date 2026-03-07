"use client";

import type { RuntimeEvent } from "@openbeam/types/canvas/runtime-events";
import { create } from "zustand";

type ConnectionStatus = "idle" | "connecting" | "connected" | "error";

type TimelineEntry = {
  stepId: string;
  nodeId: string;
  status: string;
  timestamp: number;
};

type WaitingState = {
  kind: "approval" | "input";
  nodeId: string;
  approvalId?: string;
  inputId?: string;
};

type AgenticRuntimeState = {
  sessionId: string | null;
  activeTurnId: string | null;
  activeExecutionId: string | null;
  streamingTurnId: string | null;
  completedStreamingTurnIds: Record<string, true>;
  connectionStatus: ConnectionStatus;
  events: RuntimeEvent[];
  eventIdSet: Record<string, true>;
  lastSequence: number;
  messageIdsByTurn: Record<
    string,
    { userMessageId: string; assistantMessageId: string }
  >;
  timelineByExecutionId: Record<string, TimelineEntry[]>;
  nodeStatusByExecutionId: Record<string, Record<string, string>>;
  edgeStateByExecutionId: Record<
    string,
    Record<string, "idle" | "running" | "success" | "error">
  >;
  waitingStateByExecutionId: Record<string, WaitingState | undefined>;
};

type ApplyEventOptions = { local?: boolean };

type AgenticRuntimeActions = {
  applyEvent: (event: RuntimeEvent, options?: ApplyEventOptions) => void;
  applyEvents: (events: RuntimeEvent[]) => void;
  setSessionId: (sessionId: string) => void;
  setConnectionStatus: (status: ConnectionStatus) => void;
  setStreamingTurnId: (turnId: string | null) => void;
  clearActiveTurn: () => void;
  resetSessionState: () => void;
};

type AgenticRuntime = AgenticRuntimeState & AgenticRuntimeActions;

const INITIAL_STATE: AgenticRuntimeState = {
  sessionId: null,
  activeTurnId: null,
  activeExecutionId: null,
  streamingTurnId: null,
  completedStreamingTurnIds: {},
  connectionStatus: "idle",
  events: [],
  eventIdSet: {},
  lastSequence: 0,
  messageIdsByTurn: {},
  timelineByExecutionId: {},
  nodeStatusByExecutionId: {},
  edgeStateByExecutionId: {},
  waitingStateByExecutionId: {},
};

function deriveStateFromEvent(
  state: Partial<AgenticRuntimeState>,
  event: RuntimeEvent
): Partial<AgenticRuntimeState> {
  const payloadType = event.payload.type;

  switch (payloadType) {
    case "chat.user_message":
      return { ...state, activeTurnId: event.turnId ?? state.activeTurnId };
    case "chat.assistant_final":
      return { ...state, activeTurnId: null };
    case "execution.started":
      return {
        ...state,
        activeExecutionId: event.payload.executionId,
      };
    case "execution.completed":
    case "execution.failed":
      return { ...state, activeExecutionId: null };
    case "execution.progress": {
      const { executionId, nodeId } = event.payload;
      if (!nodeId) {
        return state;
      }
      const existing = state.nodeStatusByExecutionId ?? {};
      const nodeMap = existing[executionId] ?? {};
      return {
        ...state,
        nodeStatusByExecutionId: {
          ...existing,
          [executionId]: { ...nodeMap, [nodeId]: "running" },
        },
      };
    }
    case "tool.call_start":
    case "tool.call_result":
    case "chat.assistant_delta":
    case "chat.thinking":
    case "canvas.op_applied":
    case "canvas.op_rejected":
    case "canvas.snapshot":
    case "session.started":
    case "session.resumed":
      return state;
    default:
      return state;
  }
}

export const useAgenticRuntimeStore = create<AgenticRuntime>((set, get) => ({
  ...INITIAL_STATE,

  applyEvent: (event, options) => {
    const state = get();

    if (
      !options?.local &&
      (!state.sessionId || event.sessionId !== state.sessionId)
    ) {
      return;
    }

    if (
      !options?.local &&
      event.turnId &&
      (state.streamingTurnId === event.turnId ||
        state.completedStreamingTurnIds[event.turnId])
    ) {
      return;
    }

    if (state.eventIdSet[event.eventId]) {
      return;
    }

    const derived = deriveStateFromEvent({}, event);
    const newSequence = Math.max(state.lastSequence, event.sequence);

    set({
      events: [...state.events, event],
      eventIdSet: { ...state.eventIdSet, [event.eventId]: true },
      lastSequence: newSequence,
      ...derived,
    });
  },

  applyEvents: (events) => {
    const state = get();
    const newEvents: RuntimeEvent[] = [];
    const newIdEntries: Record<string, true> = {};
    let derived: Partial<AgenticRuntimeState> = {};
    let maxSeq = state.lastSequence;

    for (const event of events) {
      if (state.eventIdSet[event.eventId] || newIdEntries[event.eventId]) {
        continue;
      }
      newEvents.push(event);
      newIdEntries[event.eventId] = true;
      derived = deriveStateFromEvent(derived, event);
      maxSeq = Math.max(maxSeq, event.sequence);
    }

    if (newEvents.length === 0) {
      return;
    }

    set({
      events: [...state.events, ...newEvents],
      eventIdSet: { ...state.eventIdSet, ...newIdEntries },
      lastSequence: maxSeq,
      ...derived,
    });
  },

  setSessionId: (sessionId) => set({ sessionId }),

  setConnectionStatus: (status) => set({ connectionStatus: status }),

  setStreamingTurnId: (turnId) => set({ streamingTurnId: turnId }),

  clearActiveTurn: () =>
    set((state) => ({
      activeTurnId: null,
      streamingTurnId: null,
      completedStreamingTurnIds: state.streamingTurnId
        ? {
            ...state.completedStreamingTurnIds,
            [state.streamingTurnId]: true as const,
          }
        : state.completedStreamingTurnIds,
    })),

  resetSessionState: () => set(INITIAL_STATE),
}));

export type { AgenticRuntimeState, AgenticRuntimeActions, ConnectionStatus };
