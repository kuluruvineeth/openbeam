"use client";

import type {
  MissionAgentLaneState,
  MissionApprovalQueueItem,
  MissionEventLedgerItem,
  ToolCallSummary,
} from "@openplane/types/mission-control";
import { create } from "zustand";
import { useShallow } from "zustand/react/shallow";

type BudgetState = {
  consumedCents: number;
  budgetCents: number;
  burnRateCentsPerMinute: number;
  perAgentCosts: Record<string, number>;
};

const INITIAL_BUDGET: BudgetState = {
  consumedCents: 0,
  budgetCents: 0,
  burnRateCentsPerMinute: 0,
  perAgentCosts: {},
};

type MissionRuntimeState = {
  eventsByRun: Record<string, MissionEventLedgerItem[]>;
  resumeCursor: Record<string, number>;
  agentBoardState: Record<string, MissionAgentLaneState>;
  approvalQueue: MissionApprovalQueueItem[];
  selectedApprovalIds: Set<string>;
  budgetState: BudgetState;
};

type AgentSeed = {
  id: string;
  name: string;
  role: string;
  status: string;
};

type MissionRuntimeActions = {
  ingestEvent: (runId: string, event: MissionEventLedgerItem) => void;
  replayFromCursor: (runId: string, events: MissionEventLedgerItem[]) => void;
  seedAgentBoard: (agents: AgentSeed[]) => void;
  getLastCursor: (runId: string) => number | undefined;
  reset: (runId: string) => void;
  resetAll: () => void;
  toggleApprovalSelection: (approvalId: string) => void;
  selectAllApprovals: () => void;
  clearApprovalSelection: () => void;
};

type MissionRuntimeStore = MissionRuntimeState & MissionRuntimeActions;

const MAX_RECENT_TOOL_CALLS = 5;

const AGENT_STATUS_NORMALIZATION: Record<
  string,
  MissionAgentLaneState["status"]
> = {
  idle: "idle",
  pending: "idle",
  completed: "completed",
  done: "completed",
  running: "running",
  active: "running",
  initializing: "running",
  blocked: "blocked",
  paused: "blocked",
  awaiting_input: "blocked",
  failed: "failed",
  timed_out: "failed",
};

const TERMINAL_STATUS_BY_EVENT_TYPE: Partial<
  Record<string, MissionAgentLaneState["status"]>
> = {
  orchestrator_completed: "completed",
  "mission.completed": "completed",
  orchestrator_failed: "failed",
  "mission.failed": "failed",
  budget_exceeded: "failed",
  orchestrator_cancelled: "idle",
  "mission.cancelled": "idle",
};

function normalizeAgentStatus(status: string): MissionAgentLaneState["status"] {
  const normalized = status.trim().toLowerCase();
  return AGENT_STATUS_NORMALIZATION[normalized] ?? "idle";
}

function resolveEventAgentId(
  board: Record<string, MissionAgentLaneState>,
  event: MissionEventLedgerItem
): string | undefined {
  const payloadAgentId = event.payload?.agentId;
  if (typeof payloadAgentId === "string" && payloadAgentId.length > 0) {
    return payloadAgentId;
  }

  const normalizedAgentName = event.agentName?.trim().toLowerCase();
  if (!normalizedAgentName) {
    return;
  }

  for (const agent of Object.values(board)) {
    if (agent.agentName.trim().toLowerCase() === normalizedAgentName) {
      return agent.agentId;
    }
  }

  return;
}

function applyTerminalEventToAgentBoard(
  board: Record<string, MissionAgentLaneState>,
  event: MissionEventLedgerItem
): Record<string, MissionAgentLaneState> {
  const settledStatus = TERMINAL_STATUS_BY_EVENT_TYPE[event.eventType];
  if (!settledStatus) {
    return board;
  }

  let changed = false;
  const nextBoard: Record<string, MissionAgentLaneState> = {};

  for (const [agentId, lane] of Object.entries(board)) {
    const shouldSettle = lane.status === "running" || lane.status === "blocked";
    if (!shouldSettle) {
      nextBoard[agentId] = lane;
      continue;
    }

    changed = true;
    nextBoard[agentId] = {
      ...lane,
      status: settledStatus,
      currentTaskId: undefined,
      currentTaskTitle: undefined,
      lastActivityAt: event.timestamp,
      errorMessage:
        settledStatus === "failed"
          ? (lane.errorMessage ?? event.summary)
          : lane.errorMessage,
    };
  }

  return changed ? nextBoard : board;
}

function sortEventsChronologically(
  events: MissionEventLedgerItem[]
): MissionEventLedgerItem[] {
  return [...events].sort(
    (a, b) => a.timestamp - b.timestamp || a.sequence - b.sequence
  );
}

function createDefaultAgent(
  agentId: string,
  agentName: string
): MissionAgentLaneState {
  return {
    agentId,
    agentName,
    role: "",
    status: "idle" as const,
    stepsCompleted: 0,
    tokensUsed: 0,
    costCents: 0,
    recentToolCalls: [],
    model: undefined,
    errorMessage: undefined,
    totalSteps: undefined,
  };
}

function updateToolCallStatus(
  toolCalls: ToolCallSummary[],
  toolCallId: string,
  status: ToolCallSummary["status"],
  timestamp: number
): ToolCallSummary[] {
  return toolCalls.map((tc) =>
    tc.toolCallId === toolCallId
      ? {
          ...tc,
          status,
          durationMs: timestamp - tc.startedAt,
        }
      : tc
  );
}

function applyEventToAgentBoard(
  board: Record<string, MissionAgentLaneState>,
  event: MissionEventLedgerItem
): Record<string, MissionAgentLaneState> {
  const afterTerminal = applyTerminalEventToAgentBoard(board, event);
  if (afterTerminal !== board) {
    return afterTerminal;
  }

  const agentId = resolveEventAgentId(board, event);
  if (!agentId) {
    return board;
  }

  const current =
    board[agentId] ?? createDefaultAgent(agentId, event.agentName ?? agentId);

  switch (event.eventType) {
    case "agent_dispatched":
      return {
        ...board,
        [agentId]: {
          ...current,
          status: "running",
          role: (event.payload?.role as string) || current.role,
          currentTaskId: event.payload?.taskId as string,
          currentTaskTitle: event.payload?.taskTitle as string,
          lastActivityAt: event.timestamp,
        },
      };
    case "agent_run_started":
    case "run.started":
      return {
        ...board,
        [agentId]: {
          ...current,
          status: "running",
          role: (event.payload?.role as string) || current.role,
          model: (event.payload?.model as string) ?? current.model,
          lastActivityAt: event.timestamp,
        },
      };
    case "agent_run_completed":
    case "run.completed": {
      const steps = (event.payload?.steps as number) ?? 0;
      const tokens = (event.payload?.tokensUsed as number) ?? 0;
      const cost = (event.payload?.costCents as number) ?? 0;
      return {
        ...board,
        [agentId]: {
          ...current,
          status: "completed",
          stepsCompleted: steps || current.stepsCompleted + 1,
          tokensUsed: tokens || current.tokensUsed,
          costCents: cost || current.costCents,
          currentTaskId: undefined,
          currentTaskTitle: undefined,
          lastActivityAt: event.timestamp,
        },
      };
    }
    case "agent_run_failed":
    case "run.failed":
      return {
        ...board,
        [agentId]: {
          ...current,
          status: "failed",
          errorMessage:
            (event.payload?.errorMessage as string) ??
            (event.payload?.error as string) ??
            current.errorMessage,
          lastActivityAt: event.timestamp,
        },
      };
    case "agent_step_completed": {
      const stepTokens = (event.payload?.tokensUsed as number) ?? 0;
      const stepCost = (event.payload?.costCents as number) ?? 0;
      return {
        ...board,
        [agentId]: {
          ...current,
          stepsCompleted:
            (event.payload?.step as number) ?? current.stepsCompleted + 1,
          tokensUsed: current.tokensUsed + stepTokens,
          costCents: current.costCents + stepCost,
          lastActivityAt: event.timestamp,
        },
      };
    }
    case "tool.started": {
      const recentToolCalls = [
        ...current.recentToolCalls,
        {
          toolCallId: event.payload?.toolCallId as string,
          toolName: event.payload?.toolName as string,
          status: "running" as const,
          startedAt: event.timestamp,
        },
      ].slice(-MAX_RECENT_TOOL_CALLS);

      return {
        ...board,
        [agentId]: {
          ...current,
          status: "running",
          recentToolCalls,
          lastActivityAt: event.timestamp,
        },
      };
    }
    case "tool.completed": {
      const toolCallId = event.payload?.toolCallId as string;
      return {
        ...board,
        [agentId]: {
          ...current,
          stepsCompleted: current.stepsCompleted + 1,
          recentToolCalls: updateToolCallStatus(
            current.recentToolCalls,
            toolCallId,
            "completed",
            event.timestamp
          ),
          lastActivityAt: event.timestamp,
        },
      };
    }
    case "tool.failed": {
      const failedToolCallId = event.payload?.toolCallId as string;
      return {
        ...board,
        [agentId]: {
          ...current,
          recentToolCalls: updateToolCallStatus(
            current.recentToolCalls,
            failedToolCallId,
            "failed",
            event.timestamp
          ),
          errorMessage:
            (event.payload?.errorMessage as string) ?? current.errorMessage,
          lastActivityAt: event.timestamp,
        },
      };
    }
    case "task.claimed":
      return {
        ...board,
        [agentId]: {
          ...current,
          status: "running",
          currentTaskId: event.payload?.taskId as string,
          currentTaskTitle: event.payload?.taskTitle as string,
          lastActivityAt: event.timestamp,
        },
      };
    case "task.completed":
      return {
        ...board,
        [agentId]: {
          ...current,
          currentTaskId: undefined,
          currentTaskTitle: undefined,
          stepsCompleted: current.stepsCompleted + 1,
          lastActivityAt: event.timestamp,
        },
      };
    case "approval.requested":
    case "approval_requested":
      return {
        ...board,
        [agentId]: {
          ...current,
          status: "blocked",
          lastActivityAt: event.timestamp,
        },
      };
    case "approval.resolved":
    case "approval_resolved":
      return {
        ...board,
        [agentId]: {
          ...current,
          status: "running",
          lastActivityAt: event.timestamp,
        },
      };
    default:
      return board;
  }
}

function applyEventToApprovals(
  queue: MissionApprovalQueueItem[],
  event: MissionEventLedgerItem
): MissionApprovalQueueItem[] {
  if (
    event.eventType === "approval.requested" ||
    event.eventType === "approval_requested"
  ) {
    return [
      ...queue,
      {
        approvalId: event.payload?.approvalId as string,
        missionId: event.missionId,
        runId: event.runId,
        agentName: event.agentName ?? "",
        actionIntent: (event.payload?.intent as string) ?? "",
        riskLevel:
          (event.payload?.riskLevel as MissionApprovalQueueItem["riskLevel"]) ??
          "medium",
        status: "pending",
        requestedAt: event.timestamp,
        agentId: event.payload?.agentId as string | undefined,
        toolName: event.payload?.toolName as string | undefined,
        toolParams: event.payload?.toolParams as
          | Record<string, unknown>
          | undefined,
        riskFactors: event.payload?.riskFactors as string[] | undefined,
        expiresAt: event.payload?.expiresAt as number | undefined,
      },
    ];
  }

  if (
    event.eventType === "approval.resolved" ||
    event.eventType === "approval_resolved"
  ) {
    const approvalId = event.payload?.approvalId as string;
    return queue.map((item) =>
      item.approvalId === approvalId
        ? {
            ...item,
            status: (event.payload?.approved
              ? "approved"
              : "rejected") as MissionApprovalQueueItem["status"],
            resolvedAt: event.timestamp,
            resolvedById: event.payload?.resolvedById as string | undefined,
            reason: event.payload?.reason as string | undefined,
          }
        : item
    );
  }

  return queue;
}

function applyEventToBudget(
  budget: BudgetState,
  event: MissionEventLedgerItem
): BudgetState {
  if (event.eventType === "cost.updated") {
    const agentId = event.payload?.agentId as string | undefined;
    const costCents = event.payload?.costCents as number | undefined;
    const consumedCents = event.payload?.consumedCents as number | undefined;
    const burnRate = event.payload?.burnRateCentsPerMinute as
      | number
      | undefined;

    return {
      ...budget,
      consumedCents: consumedCents ?? budget.consumedCents,
      burnRateCentsPerMinute: burnRate ?? budget.burnRateCentsPerMinute,
      perAgentCosts:
        agentId && costCents !== undefined
          ? { ...budget.perAgentCosts, [agentId]: costCents }
          : budget.perAgentCosts,
    };
  }

  if (event.eventType === "budget.set") {
    return {
      ...budget,
      budgetCents: (event.payload?.budgetCents as number) ?? budget.budgetCents,
    };
  }

  return budget;
}

const INITIAL_STATE: MissionRuntimeState = {
  eventsByRun: {},
  resumeCursor: {},
  agentBoardState: {},
  approvalQueue: [],
  selectedApprovalIds: new Set(),
  budgetState: INITIAL_BUDGET,
};

export const useMissionRuntimeStore = create<MissionRuntimeStore>(
  (set, get) => ({
    ...INITIAL_STATE,

    ingestEvent: (runId, event) => {
      const currentCursor = get().resumeCursor[runId] ?? 0;
      const maxKnownTimestamp = (get().eventsByRun[runId] ?? []).reduce(
        (max, e) => Math.max(max, e.timestamp),
        0
      );
      if (
        event.sequence <= currentCursor &&
        event.timestamp <= maxKnownTimestamp
      ) {
        return;
      }

      set((state) => {
        const runEvents = sortEventsChronologically([
          ...(state.eventsByRun[runId] ?? []),
          event,
        ]);

        return {
          eventsByRun: { ...state.eventsByRun, [runId]: runEvents },
          resumeCursor: {
            ...state.resumeCursor,
            [runId]: Math.max(state.resumeCursor[runId] ?? 0, event.sequence),
          },
          agentBoardState: applyEventToAgentBoard(state.agentBoardState, event),
          approvalQueue: applyEventToApprovals(state.approvalQueue, event),
          budgetState: applyEventToBudget(state.budgetState, event),
        };
      });
    },

    replayFromCursor: (runId, events) => {
      set((state) => {
        const orderedEvents = sortEventsChronologically(events);
        let board = { ...state.agentBoardState };
        let approvals = [...state.approvalQueue];
        let budget = { ...state.budgetState };

        for (const event of orderedEvents) {
          board = applyEventToAgentBoard(board, event);
          approvals = applyEventToApprovals(approvals, event);
          budget = applyEventToBudget(budget, event);
        }

        const maxSequence = orderedEvents.reduce(
          (max, event) => Math.max(max, event.sequence),
          0
        );
        return {
          eventsByRun: { ...state.eventsByRun, [runId]: orderedEvents },
          resumeCursor: {
            ...state.resumeCursor,
            [runId]: maxSequence,
          },
          agentBoardState: board,
          approvalQueue: approvals,
          budgetState: budget,
        };
      });
    },

    seedAgentBoard: (agents) => {
      set((state) => {
        const board = { ...state.agentBoardState };
        for (const agent of agents) {
          if (!board[agent.id]) {
            board[agent.id] = {
              ...createDefaultAgent(agent.id, agent.name),
              role: agent.role,
              status: normalizeAgentStatus(agent.status),
            };
          } else if (!board[agent.id].role && agent.role) {
            board[agent.id] = { ...board[agent.id], role: agent.role };
          }
        }
        return { agentBoardState: board };
      });
    },

    getLastCursor: (runId) => get().resumeCursor[runId],

    reset: (runId) => {
      set((state) => {
        const { [runId]: _, ...rest } = state.eventsByRun;
        const { [runId]: __, ...cursors } = state.resumeCursor;
        return { eventsByRun: rest, resumeCursor: cursors };
      });
    },

    resetAll: () => set(INITIAL_STATE),

    toggleApprovalSelection: (approvalId) => {
      set((state) => {
        const next = new Set(state.selectedApprovalIds);
        if (next.has(approvalId)) {
          next.delete(approvalId);
        } else {
          next.add(approvalId);
        }
        return { selectedApprovalIds: next };
      });
    },

    selectAllApprovals: () => {
      set((state) => {
        const pendingIds = state.approvalQueue
          .filter((a) => a.status === "pending")
          .map((a) => a.approvalId);
        return { selectedApprovalIds: new Set(pendingIds) };
      });
    },

    clearApprovalSelection: () => {
      set({ selectedApprovalIds: new Set() });
    },
  })
);

const EMPTY_EVENTS: MissionEventLedgerItem[] = [];

export const useMissionEvents = (runId: string) =>
  useMissionRuntimeStore((s) => s.eventsByRun[runId] ?? EMPTY_EVENTS);

export const useAgentBoard = () =>
  useMissionRuntimeStore((s) => s.agentBoardState);

export const useApprovalQueue = () =>
  useMissionRuntimeStore((s) => s.approvalQueue);

export const usePendingApprovals = () =>
  useMissionRuntimeStore(
    useShallow((s) => s.approvalQueue.filter((a) => a.status === "pending"))
  );

export const useBudgetState = () =>
  useMissionRuntimeStore((s) => s.budgetState);

export const useBudgetPercentage = () =>
  useMissionRuntimeStore((s) =>
    s.budgetState.budgetCents > 0
      ? (s.budgetState.consumedCents / s.budgetState.budgetCents) * 100
      : 0
  );

export const useSelectedApprovalIds = () =>
  useMissionRuntimeStore((s) => s.selectedApprovalIds);

export { applyEventToAgentBoard, applyEventToApprovals, applyEventToBudget };
