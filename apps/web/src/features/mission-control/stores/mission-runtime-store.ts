"use client";

import type {
  MissionAgentLaneState,
  MissionApprovalQueueItem,
  MissionEventLedgerItem,
  ToolCallSummary,
} from "@openplane/types/mission-control";
import { create } from "zustand";

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

type MissionRuntimeActions = {
  ingestEvent: (runId: string, event: MissionEventLedgerItem) => void;
  replayFromCursor: (runId: string, events: MissionEventLedgerItem[]) => void;
  getLastCursor: (runId: string) => number | undefined;
  reset: (runId: string) => void;
  resetAll: () => void;
  toggleApprovalSelection: (approvalId: string) => void;
  selectAllApprovals: () => void;
  clearApprovalSelection: () => void;
};

type MissionRuntimeStore = MissionRuntimeState & MissionRuntimeActions;

const MAX_RECENT_TOOL_CALLS = 5;

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
  const agentId = event.payload?.agentId as string | undefined;
  if (!agentId) {
    return board;
  }

  const current =
    board[agentId] ?? createDefaultAgent(agentId, event.agentName ?? agentId);

  switch (event.eventType) {
    case "run.started":
      return {
        ...board,
        [agentId]: {
          ...current,
          status: "running",
          model: (event.payload?.model as string) ?? current.model,
          lastActivityAt: event.timestamp,
        },
      };
    case "run.completed":
      return {
        ...board,
        [agentId]: {
          ...current,
          status: "completed",
          stepsCompleted: current.stepsCompleted + 1,
          lastActivityAt: event.timestamp,
        },
      };
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
      return {
        ...board,
        [agentId]: {
          ...current,
          status: "blocked",
          lastActivityAt: event.timestamp,
        },
      };
    case "approval.resolved":
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
  if (event.eventType === "approval.requested") {
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

  if (event.eventType === "approval.resolved") {
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
      if (event.sequence <= currentCursor) {
        return;
      }

      set((state) => {
        const runEvents = [...(state.eventsByRun[runId] ?? []), event];

        return {
          eventsByRun: { ...state.eventsByRun, [runId]: runEvents },
          resumeCursor: {
            ...state.resumeCursor,
            [runId]: event.sequence,
          },
          agentBoardState: applyEventToAgentBoard(state.agentBoardState, event),
          approvalQueue: applyEventToApprovals(state.approvalQueue, event),
          budgetState: applyEventToBudget(state.budgetState, event),
        };
      });
    },

    replayFromCursor: (runId, events) => {
      set((state) => {
        let board = { ...state.agentBoardState };
        let approvals = [...state.approvalQueue];
        let budget = { ...state.budgetState };

        for (const event of events) {
          board = applyEventToAgentBoard(board, event);
          approvals = applyEventToApprovals(approvals, event);
          budget = applyEventToBudget(budget, event);
        }

        const lastEvent = events.at(-1);
        return {
          eventsByRun: { ...state.eventsByRun, [runId]: events },
          resumeCursor: {
            ...state.resumeCursor,
            [runId]: lastEvent?.sequence ?? 0,
          },
          agentBoardState: board,
          approvalQueue: approvals,
          budgetState: budget,
        };
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

export const useMissionEvents = (runId: string) =>
  useMissionRuntimeStore((s) => s.eventsByRun[runId] ?? []);

export const useAgentBoard = () =>
  useMissionRuntimeStore((s) => s.agentBoardState);

export const useApprovalQueue = () =>
  useMissionRuntimeStore((s) => s.approvalQueue);

export const usePendingApprovals = () =>
  useMissionRuntimeStore((s) =>
    s.approvalQueue.filter((a) => a.status === "pending")
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
