"use client";

import type {
  AgentHealthSummary,
  AgentMessageItem,
  MissionAgentLaneState,
  MissionApprovalQueueItem,
  MissionEventLedgerItem,
  ReflectionHistoryEntry,
  SpawnProvenanceRecord,
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
  evictionCursor: Record<string, number>;
  agentBoardState: Record<string, MissionAgentLaneState>;
  agentNameIndex: Record<string, string>;
  approvalQueue: MissionApprovalQueueItem[];
  selectedApprovalIds: Set<string>;
  budgetState: BudgetState;
  messagesByMission: Record<string, AgentMessageItem[]>;
  reflectionHistory: Record<string, ReflectionHistoryEntry[]>;
  healthSnapshot: AgentHealthSummary | null;
  spawnEvents: SpawnProvenanceRecord[];
};

type AgentSeed = {
  id: string;
  name: string;
  role: string;
  status: string;
};

type MissionRuntimeActions = {
  ingestEvent: (runId: string, event: MissionEventLedgerItem) => void;
  ingestBatch: (runId: string, events: MissionEventLedgerItem[]) => void;
  replayFromCursor: (runId: string, events: MissionEventLedgerItem[]) => void;
  seedAgentBoard: (agents: AgentSeed[]) => void;
  getLastCursor: (runId: string) => number | undefined;
  reset: (runId: string) => void;
  resetAll: () => void;
  setHealthSnapshot: (snapshot: AgentHealthSummary | null) => void;
  toggleApprovalSelection: (approvalId: string) => void;
  selectAllApprovals: () => void;
  clearApprovalSelection: () => void;
};

type MissionRuntimeStore = MissionRuntimeState & MissionRuntimeActions;

const MAX_RECENT_TOOL_CALLS = 5;
const MAX_MESSAGES_PER_MISSION = 500;
const MAX_REFLECTIONS_PER_AGENT = 50;
const MAX_EVENTS_IN_MEMORY = 5000;

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

const MESSAGE_EVENT_TYPES = new Set([
  "agent.message_sent",
  "agent.message_received",
  "agent_message_sent",
  "agent_message_received",
]);

const REFLECTION_EVENT_TYPES = new Set([
  "agent.reflection",
  "agent_self_evaluated",
]);

const REPLAN_EVENT_TYPES = new Set(["agent.replan", "agent_replanned"]);

const ESCALATION_EVENT_TYPES = new Set(["agent.escalated", "agent_escalated"]);

const SPAWN_EVENT_TYPES = new Set(["agent.spawned", "agent_spawned"]);

function normalizeAgentStatus(status: string): MissionAgentLaneState["status"] {
  const normalized = status.trim().toLowerCase();
  return AGENT_STATUS_NORMALIZATION[normalized] ?? "idle";
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
    status: "idle",
    stepsCompleted: 0,
    tokensUsed: 0,
    costCents: 0,
    recentToolCalls: [],
    model: undefined,
    errorMessage: undefined,
    totalSteps: undefined,
    timeoutTier: undefined,
    chunkProgress: null,
    reflectionScore: null,
    replanCount: 0,
    isReflecting: false,
    stuckReason: null,
    spawnedBy: null,
    spawnDepth: 0,
    messageCount: { sent: 0, received: 0 },
    crossMissionLinks: [],
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

function toNonEmptyString(value: unknown): string | undefined {
  if (typeof value === "string" && value.length > 0) {
    return value;
  }

  return;
}

function toNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
}

function toBoolean(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

function buildAgentNameIndex(
  board: Record<string, MissionAgentLaneState>
): Record<string, string> {
  const index: Record<string, string> = {};
  for (const agent of Object.values(board)) {
    const key = agent.agentName.trim().toLowerCase();
    if (key) {
      index[key] = agent.agentId;
    }
  }
  return index;
}

function resolveEventAgentId(
  board: Record<string, MissionAgentLaneState>,
  event: MissionEventLedgerItem,
  nameIndex?: Record<string, string>
): string | undefined {
  const payloadAgentId = toNonEmptyString(event.payload?.agentId);
  if (payloadAgentId) {
    return payloadAgentId;
  }

  const normalizedAgentName = event.agentName?.trim().toLowerCase();
  if (!normalizedAgentName) {
    return;
  }

  if (nameIndex) {
    return nameIndex[normalizedAgentName];
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

function applyEventToAgentBoard(
  board: Record<string, MissionAgentLaneState>,
  event: MissionEventLedgerItem,
  nameIndex?: Record<string, string>
): Record<string, MissionAgentLaneState> {
  const afterTerminal = applyTerminalEventToAgentBoard(board, event);
  if (afterTerminal !== board) {
    return afterTerminal;
  }

  if (SPAWN_EVENT_TYPES.has(event.eventType)) {
    const childId =
      toNonEmptyString(event.payload?.childAgentId) ??
      toNonEmptyString(event.payload?.spawnedAgentId) ??
      resolveEventAgentId(board, event, nameIndex);

    if (!childId) {
      return board;
    }

    const childName =
      toNonEmptyString(event.payload?.childAgentName) ??
      event.agentName ??
      childId;
    const parentId = toNonEmptyString(event.payload?.parentAgentId) ?? null;
    const depth = toNumber(event.payload?.spawnDepth) ?? 0;
    const role = toNonEmptyString(event.payload?.role) ?? "";

    if (nameIndex) {
      const normalizedChildName = childName.trim().toLowerCase();
      if (normalizedChildName) {
        nameIndex[normalizedChildName] = childId;
      }
    }

    return {
      ...board,
      [childId]: {
        ...createDefaultAgent(childId, childName),
        role,
        status: "running",
        spawnedBy: parentId,
        spawnDepth: depth,
        lastActivityAt: event.timestamp,
      },
    };
  }

  const agentId = resolveEventAgentId(board, event, nameIndex);
  if (!agentId) {
    return board;
  }

  const current =
    board[agentId] ?? createDefaultAgent(agentId, event.agentName ?? agentId);

  if (REFLECTION_EVENT_TYPES.has(event.eventType)) {
    const score =
      toNumber(event.payload?.score) ??
      toNumber(event.payload?.progressScore) ??
      current.reflectionScore ??
      null;
    const isReflecting = toBoolean(event.payload?.isReflecting) ?? false;

    return {
      ...board,
      [agentId]: {
        ...current,
        reflectionScore: score,
        isReflecting,
        lastActivityAt: event.timestamp,
      },
    };
  }

  if (REPLAN_EVENT_TYPES.has(event.eventType)) {
    const reason =
      toNonEmptyString(event.payload?.reason) ?? current.stuckReason ?? null;
    const replanCount =
      toNumber(event.payload?.replanCount) ?? current.replanCount + 1;

    return {
      ...board,
      [agentId]: {
        ...current,
        replanCount,
        stuckReason: reason,
        isReflecting: false,
        lastActivityAt: event.timestamp,
      },
    };
  }

  if (ESCALATION_EVENT_TYPES.has(event.eventType)) {
    return {
      ...board,
      [agentId]: {
        ...current,
        status: "blocked",
        stuckReason:
          toNonEmptyString(event.payload?.reason) ?? current.stuckReason,
        isReflecting: false,
        lastActivityAt: event.timestamp,
      },
    };
  }

  switch (event.eventType) {
    case "agent_dispatched":
      return {
        ...board,
        [agentId]: {
          ...current,
          status: "running",
          role: toNonEmptyString(event.payload?.role) ?? current.role,
          currentTaskId: toNonEmptyString(event.payload?.taskId),
          currentTaskTitle: toNonEmptyString(event.payload?.taskTitle),
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
          role: toNonEmptyString(event.payload?.role) ?? current.role,
          model: toNonEmptyString(event.payload?.model) ?? current.model,
          isReflecting: false,
          lastActivityAt: event.timestamp,
        },
      };

    case "agent_run_completed":
    case "run.completed": {
      const steps = toNumber(event.payload?.steps) ?? 0;
      const tokens = toNumber(event.payload?.tokensUsed) ?? 0;
      const cost = toNumber(event.payload?.costCents) ?? 0;
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
          isReflecting: false,
          chunkProgress: null,
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
            toNonEmptyString(event.payload?.errorMessage) ??
            toNonEmptyString(event.payload?.error) ??
            current.errorMessage,
          isReflecting: false,
          lastActivityAt: event.timestamp,
        },
      };

    case "agent_step_completed": {
      const stepTokens = toNumber(event.payload?.tokensUsed) ?? 0;
      const stepCost = toNumber(event.payload?.costCents) ?? 0;
      return {
        ...board,
        [agentId]: {
          ...current,
          stepsCompleted:
            toNumber(event.payload?.step) ?? current.stepsCompleted + 1,
          tokensUsed: current.tokensUsed + stepTokens,
          costCents: current.costCents + stepCost,
          lastActivityAt: event.timestamp,
        },
      };
    }

    case "tool.started": {
      const toolCallId =
        toNonEmptyString(event.payload?.toolCallId) ?? event.eventId;
      const toolName = toNonEmptyString(event.payload?.toolName) ?? "unknown";
      const recentToolCalls = [
        ...current.recentToolCalls,
        {
          toolCallId,
          toolName,
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
      const toolCallId = toNonEmptyString(event.payload?.toolCallId) ?? "";
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
      const toolCallId = toNonEmptyString(event.payload?.toolCallId) ?? "";
      return {
        ...board,
        [agentId]: {
          ...current,
          recentToolCalls: updateToolCallStatus(
            current.recentToolCalls,
            toolCallId,
            "failed",
            event.timestamp
          ),
          errorMessage:
            toNonEmptyString(event.payload?.errorMessage) ??
            current.errorMessage,
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
          currentTaskId: toNonEmptyString(event.payload?.taskId),
          currentTaskTitle: toNonEmptyString(event.payload?.taskTitle),
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

    case "agent.timeout_extended":
    case "agent_timeout_extended": {
      const tier = toNonEmptyString(event.payload?.tier) as
        | MissionAgentLaneState["timeoutTier"]
        | undefined;

      return {
        ...board,
        [agentId]: {
          ...current,
          timeoutTier: tier ?? current.timeoutTier,
          lastActivityAt: event.timestamp,
        },
      };
    }

    case "chain.progress": {
      const chunkCurrent = toNumber(event.payload?.current) ?? 0;
      const chunkTotal = toNumber(event.payload?.total) ?? 0;

      return {
        ...board,
        [agentId]: {
          ...current,
          chunkProgress:
            chunkTotal > 0
              ? { current: chunkCurrent, total: chunkTotal }
              : null,
          lastActivityAt: event.timestamp,
        },
      };
    }

    case "agent.message_sent":
    case "agent_message_sent": {
      const messageCount = current.messageCount ?? { sent: 0, received: 0 };
      return {
        ...board,
        [agentId]: {
          ...current,
          messageCount: {
            ...messageCount,
            sent: messageCount.sent + 1,
          },
          lastActivityAt: event.timestamp,
        },
      };
    }

    case "agent.message_received":
    case "agent_message_received": {
      const messageCount = current.messageCount ?? { sent: 0, received: 0 };
      return {
        ...board,
        [agentId]: {
          ...current,
          messageCount: {
            ...messageCount,
            received: messageCount.received + 1,
          },
          lastActivityAt: event.timestamp,
        },
      };
    }

    case "cross_mission.knowledge_imported":
    case "cross_mission.agent_shared": {
      const missionId = toNonEmptyString(event.payload?.linkedMissionId) ?? "";
      const missionName =
        toNonEmptyString(event.payload?.linkedMissionName) ?? "";
      const type: MissionAgentLaneState["crossMissionLinks"][number]["type"] =
        event.eventType === "cross_mission.agent_shared"
          ? "shared"
          : "knowledge";
      const crossMissionLinks = [
        ...current.crossMissionLinks,
        {
          missionId,
          missionName,
          type,
        },
      ];

      return {
        ...board,
        [agentId]: {
          ...current,
          crossMissionLinks,
          lastActivityAt: event.timestamp,
        },
      };
    }

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
        approvalId:
          toNonEmptyString(event.payload?.approvalId) ?? event.eventId,
        missionId: event.missionId,
        runId: event.runId,
        agentName: event.agentName ?? "",
        actionIntent: toNonEmptyString(event.payload?.intent) ?? "",
        riskLevel:
          (toNonEmptyString(
            event.payload?.riskLevel
          ) as MissionApprovalQueueItem["riskLevel"]) ?? "medium",
        status: "pending",
        requestedAt: event.timestamp,
        agentId: toNonEmptyString(event.payload?.agentId),
        toolName: toNonEmptyString(event.payload?.toolName),
        toolParams: event.payload?.toolParams as
          | Record<string, unknown>
          | undefined,
        riskFactors: Array.isArray(event.payload?.riskFactors)
          ? (event.payload?.riskFactors as string[])
          : undefined,
        expiresAt: toNumber(event.payload?.expiresAt),
      },
    ];
  }

  if (
    event.eventType === "approval.resolved" ||
    event.eventType === "approval_resolved"
  ) {
    const approvalId = toNonEmptyString(event.payload?.approvalId) ?? "";
    return queue.map((item) =>
      item.approvalId === approvalId
        ? {
            ...item,
            status: (toBoolean(event.payload?.approved)
              ? "approved"
              : "rejected") as MissionApprovalQueueItem["status"],
            resolvedAt: event.timestamp,
            resolvedById: toNonEmptyString(event.payload?.resolvedById),
            reason: toNonEmptyString(event.payload?.reason),
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
    const agentId = toNonEmptyString(event.payload?.agentId);
    const costCents = toNumber(event.payload?.costCents);
    const consumedCents = toNumber(event.payload?.consumedCents);
    const burnRate = toNumber(event.payload?.burnRateCentsPerMinute);

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
      budgetCents: toNumber(event.payload?.budgetCents) ?? budget.budgetCents,
    };
  }

  return budget;
}

function applyEventToMessages(
  messages: Record<string, AgentMessageItem[]>,
  event: MissionEventLedgerItem
): Record<string, AgentMessageItem[]> {
  if (!MESSAGE_EVENT_TYPES.has(event.eventType)) {
    return messages;
  }

  const missionId = event.missionId;
  const existing = messages[missionId] ?? [];

  const messageItem: AgentMessageItem = {
    messageId: toNonEmptyString(event.payload?.messageId) ?? event.eventId,
    missionId,
    fromAgentId: toNonEmptyString(event.payload?.fromAgentId) ?? "",
    fromAgentName:
      toNonEmptyString(event.payload?.fromAgentName) ?? event.agentName ?? "",
    toAgentId: toNonEmptyString(event.payload?.toAgentId) ?? null,
    toAgentName: toNonEmptyString(event.payload?.toAgentName) ?? null,
    channel:
      (toNonEmptyString(
        event.payload?.channel
      ) as AgentMessageItem["channel"]) ?? "direct",
    contentPreview: toNonEmptyString(event.payload?.preview) ?? event.summary,
    fullContent: toNonEmptyString(event.payload?.content),
    replyToMessageId: toNonEmptyString(event.payload?.replyToMessageId) ?? null,
    sourceMissionId: toNonEmptyString(event.payload?.sourceMissionId),
    sourceMissionName: toNonEmptyString(event.payload?.sourceMissionName),
    timestamp: event.timestamp,
  };

  const deduped = existing.some(
    (item) => item.messageId === messageItem.messageId
  )
    ? existing
    : [...existing, messageItem];

  return {
    ...messages,
    [missionId]: deduped.slice(-MAX_MESSAGES_PER_MISSION),
  };
}

function applyEventToReflections(
  history: Record<string, ReflectionHistoryEntry[]>,
  event: MissionEventLedgerItem
): Record<string, ReflectionHistoryEntry[]> {
  if (!REFLECTION_EVENT_TYPES.has(event.eventType)) {
    return history;
  }

  const agentId =
    toNonEmptyString(event.payload?.agentId) ??
    toNonEmptyString(event.payload?.agent) ??
    "";
  if (!agentId) {
    return history;
  }

  const existing = history[agentId] ?? [];
  const entry: ReflectionHistoryEntry = {
    entryId: event.eventId,
    agentId,
    agentName: event.agentName ?? agentId,
    stepNumber:
      toNumber(event.payload?.stepNumber) ?? toNumber(event.payload?.step) ?? 0,
    score:
      toNumber(event.payload?.score) ??
      toNumber(event.payload?.progressScore) ??
      0,
    verbalMemory:
      toNonEmptyString(event.payload?.verbalMemory) ??
      toNonEmptyString(event.payload?.reasoning) ??
      event.summary,
    timestamp: event.timestamp,
    triggeredReplan: toBoolean(event.payload?.triggeredReplan) ?? false,
  };

  return {
    ...history,
    [agentId]: [...existing, entry].slice(-MAX_REFLECTIONS_PER_AGENT),
  };
}

function applyEventToSpawns(
  spawns: SpawnProvenanceRecord[],
  event: MissionEventLedgerItem
): SpawnProvenanceRecord[] {
  if (!SPAWN_EVENT_TYPES.has(event.eventType)) {
    return spawns;
  }

  const record: SpawnProvenanceRecord = {
    childAgentId:
      toNonEmptyString(event.payload?.childAgentId) ??
      toNonEmptyString(event.payload?.spawnedAgentId) ??
      "",
    childAgentName:
      toNonEmptyString(event.payload?.childAgentName) ?? event.agentName ?? "",
    parentAgentId: toNonEmptyString(event.payload?.parentAgentId) ?? "",
    parentAgentName: toNonEmptyString(event.payload?.parentAgentName) ?? "",
    spawnDepth: toNumber(event.payload?.spawnDepth) ?? 0,
    spawnReason: toNonEmptyString(event.payload?.spawnReason),
    timestamp: event.timestamp,
  };

  if (record.childAgentId.length === 0) {
    return spawns;
  }

  if (spawns.some((spawn) => spawn.childAgentId === record.childAgentId)) {
    return spawns;
  }

  return [...spawns, record];
}

const INITIAL_STATE: MissionRuntimeState = {
  eventsByRun: {},
  resumeCursor: {},
  evictionCursor: {},
  agentBoardState: {},
  agentNameIndex: {},
  approvalQueue: [],
  selectedApprovalIds: new Set(),
  budgetState: INITIAL_BUDGET,
  messagesByMission: {},
  reflectionHistory: {},
  healthSnapshot: null,
  spawnEvents: [],
};

export const useMissionRuntimeStore = create<MissionRuntimeStore>(
  (set, get) => ({
    ...INITIAL_STATE,

    ingestEvent: (runId, event) => {
      get().ingestBatch(runId, [event]);
    },

    ingestBatch: (runId, events) => {
      if (events.length === 0) {
        return;
      }

      set((state) => {
        const currentCursor = state.resumeCursor[runId] ?? 0;
        const existingEvents = state.eventsByRun[runId] ?? [];
        const maxKnownTimestamp = existingEvents.reduce(
          (max, item) => Math.max(max, item.timestamp),
          0
        );

        const newEvents = events.filter(
          (event) =>
            event.sequence > currentCursor ||
            event.timestamp > maxKnownTimestamp
        );

        if (newEvents.length === 0) {
          return state;
        }

        const runEvents = sortEventsChronologically([
          ...existingEvents,
          ...newEvents,
        ]);

        let board = { ...state.agentBoardState };
        const nameIndex = { ...state.agentNameIndex };
        let approvals = [...state.approvalQueue];
        let budget = { ...state.budgetState };
        let messages = { ...state.messagesByMission };
        let reflections = { ...state.reflectionHistory };
        let spawns = [...state.spawnEvents];

        for (const event of newEvents) {
          board = applyEventToAgentBoard(board, event, nameIndex);
          approvals = applyEventToApprovals(approvals, event);
          budget = applyEventToBudget(budget, event);
          messages = applyEventToMessages(messages, event);
          reflections = applyEventToReflections(reflections, event);
          spawns = applyEventToSpawns(spawns, event);
        }

        let maxSequence = currentCursor;
        for (const event of newEvents) {
          if (event.sequence > maxSequence) {
            maxSequence = event.sequence;
          }
        }

        let evictionCursor = state.evictionCursor[runId] ?? 0;
        let finalEvents = runEvents;
        if (runEvents.length > MAX_EVENTS_IN_MEMORY) {
          const evictCount = runEvents.length - MAX_EVENTS_IN_MEMORY;
          const evictedSlice = runEvents.slice(0, evictCount);
          evictionCursor = evictedSlice.at(-1)?.sequence ?? evictionCursor;
          finalEvents = runEvents.slice(evictCount);
        }

        return {
          eventsByRun: { ...state.eventsByRun, [runId]: finalEvents },
          resumeCursor: {
            ...state.resumeCursor,
            [runId]: maxSequence,
          },
          evictionCursor: { ...state.evictionCursor, [runId]: evictionCursor },
          agentBoardState: board,
          agentNameIndex: nameIndex,
          approvalQueue: approvals,
          budgetState: budget,
          messagesByMission: messages,
          reflectionHistory: reflections,
          spawnEvents: spawns,
        };
      });
    },

    replayFromCursor: (runId, events) => {
      if (events.length === 0) {
        return;
      }
      set((state) => {
        if ((state.eventsByRun[runId]?.length ?? 0) > 0) {
          return state;
        }
        const orderedEvents = sortEventsChronologically(events);
        let board = { ...state.agentBoardState };
        const nameIndex = { ...state.agentNameIndex };
        let approvals = [...state.approvalQueue];
        let budget = { ...state.budgetState };
        let messages = { ...state.messagesByMission };
        let reflections = { ...state.reflectionHistory };
        let spawns = [...state.spawnEvents];

        for (const event of orderedEvents) {
          board = applyEventToAgentBoard(board, event, nameIndex);
          approvals = applyEventToApprovals(approvals, event);
          budget = applyEventToBudget(budget, event);
          messages = applyEventToMessages(messages, event);
          reflections = applyEventToReflections(reflections, event);
          spawns = applyEventToSpawns(spawns, event);
        }

        const maxSequence = orderedEvents.reduce(
          (max, event) => Math.max(max, event.sequence),
          0
        );

        let evictionCursor = state.evictionCursor[runId] ?? 0;
        let finalEvents = orderedEvents;
        if (orderedEvents.length > MAX_EVENTS_IN_MEMORY) {
          const evictCount = orderedEvents.length - MAX_EVENTS_IN_MEMORY;
          const evictedSlice = orderedEvents.slice(0, evictCount);
          evictionCursor = evictedSlice.at(-1)?.sequence ?? evictionCursor;
          finalEvents = orderedEvents.slice(evictCount);
        }

        return {
          eventsByRun: { ...state.eventsByRun, [runId]: finalEvents },
          resumeCursor: { ...state.resumeCursor, [runId]: maxSequence },
          evictionCursor: { ...state.evictionCursor, [runId]: evictionCursor },
          agentBoardState: board,
          agentNameIndex: nameIndex,
          approvalQueue: approvals,
          budgetState: budget,
          messagesByMission: messages,
          reflectionHistory: reflections,
          spawnEvents: spawns,
        };
      });
    },

    seedAgentBoard: (agents) => {
      set((state) => {
        let changed = false;
        const board = { ...state.agentBoardState };
        const nameIndex = { ...state.agentNameIndex };
        for (const agent of agents) {
          const normalizedName = agent.name.trim().toLowerCase();
          if (!board[agent.id]) {
            board[agent.id] = {
              ...createDefaultAgent(agent.id, agent.name),
              role: agent.role,
              status: normalizeAgentStatus(agent.status),
            };
            if (normalizedName) {
              nameIndex[normalizedName] = agent.id;
            }
            changed = true;
          } else if (!board[agent.id].role && agent.role) {
            board[agent.id] = { ...board[agent.id], role: agent.role };
            changed = true;
          }
        }
        if (!changed) {
          return state;
        }
        return { agentBoardState: board, agentNameIndex: nameIndex };
      });
    },

    getLastCursor: (runId) => get().resumeCursor[runId],

    reset: (runId) => {
      set((state) => {
        const { [runId]: _removedEvents, ...restEvents } = state.eventsByRun;
        const { [runId]: _removedCursor, ...restCursors } = state.resumeCursor;
        const { [runId]: _removedEviction, ...restEviction } =
          state.evictionCursor;
        return {
          eventsByRun: restEvents,
          resumeCursor: restCursors,
          evictionCursor: restEviction,
        };
      });
    },

    resetAll: () =>
      set({
        ...INITIAL_STATE,
        selectedApprovalIds: new Set(),
      }),

    setHealthSnapshot: (snapshot) => set({ healthSnapshot: snapshot }),

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
          .filter((approval) => approval.status === "pending")
          .map((approval) => approval.approvalId);
        return { selectedApprovalIds: new Set(pendingIds) };
      });
    },

    clearApprovalSelection: () => {
      set({ selectedApprovalIds: new Set() });
    },
  })
);

const EMPTY_EVENTS: MissionEventLedgerItem[] = [];
const EMPTY_MESSAGES: AgentMessageItem[] = [];
const EMPTY_REFLECTIONS: ReflectionHistoryEntry[] = [];
const EMPTY_ALL_REFLECTIONS: ReflectionHistoryEntry[] = [];
const EMPTY_SPAWNS: SpawnProvenanceRecord[] = [];

export const useMissionEvents = (runId: string) =>
  useMissionRuntimeStore((state) => state.eventsByRun[runId] ?? EMPTY_EVENTS);

export const useAgentBoard = () =>
  useMissionRuntimeStore(useShallow((state) => state.agentBoardState));

export const useAgentLane = (agentId: string) =>
  useMissionRuntimeStore((state) => state.agentBoardState[agentId]);

export const useAgentName = (agentId: string | null) =>
  useMissionRuntimeStore((state) =>
    agentId ? (state.agentBoardState[agentId]?.agentName ?? null) : null
  );

export const useAgentStatusCounts = () =>
  useMissionRuntimeStore(
    useShallow((state) => {
      const agents = Object.values(state.agentBoardState);
      const total = agents.length;
      const running = agents.filter((a) => a.status === "running").length;
      const blocked = agents.filter((a) => a.status === "blocked").length;
      const completed = agents.filter((a) => a.status === "completed").length;
      const failed = agents.filter((a) => a.status === "failed").length;
      return {
        total,
        active: running + blocked,
        running,
        blocked,
        completed,
        failed,
      };
    })
  );

export const useRunningAgentCount = () =>
  useMissionRuntimeStore(
    (state) =>
      Object.values(state.agentBoardState).filter((a) => a.status === "running")
        .length
  );

const EMPTY_AGENT_NAME_MAP: Record<
  string,
  { agentName: string; role?: string }
> = {};

let _prevAgentNameMapKey = "";
let _prevAgentNameMap = EMPTY_AGENT_NAME_MAP;

export const useAgentNameMap = () =>
  useMissionRuntimeStore((state) => {
    const board = state.agentBoardState;
    const ids = Object.keys(board);
    if (ids.length === 0) {
      return EMPTY_AGENT_NAME_MAP;
    }

    const key = ids
      .map((id) => `${id}:${board[id].agentName}:${board[id].role ?? ""}`)
      .join("|");

    if (key === _prevAgentNameMapKey) {
      return _prevAgentNameMap;
    }

    const result: Record<string, { agentName: string; role?: string }> = {};
    for (const id of ids) {
      result[id] = { agentName: board[id].agentName, role: board[id].role };
    }
    _prevAgentNameMapKey = key;
    _prevAgentNameMap = result;
    return result;
  });

export const useApprovalQueue = () =>
  useMissionRuntimeStore((state) => state.approvalQueue);

export const usePendingApprovals = () =>
  useMissionRuntimeStore(
    useShallow((state) =>
      state.approvalQueue.filter((approval) => approval.status === "pending")
    )
  );

export const useBudgetState = () =>
  useMissionRuntimeStore((state) => state.budgetState);

export const useBudgetPercentage = () =>
  useMissionRuntimeStore((state) =>
    state.budgetState.budgetCents > 0
      ? (state.budgetState.consumedCents / state.budgetState.budgetCents) * 100
      : 0
  );

export const useMessages = (missionId: string) =>
  useMissionRuntimeStore(
    (state) => state.messagesByMission[missionId] ?? EMPTY_MESSAGES
  );

export const useReflectionHistory = (agentId: string) =>
  useMissionRuntimeStore(
    (state) => state.reflectionHistory[agentId] ?? EMPTY_REFLECTIONS
  );

let _prevReflectionCount = 0;
let _prevAllReflections = EMPTY_ALL_REFLECTIONS;

export const useAllReflections = () =>
  useMissionRuntimeStore((state) => {
    const entries = Object.values(state.reflectionHistory).flat();
    if (entries.length === 0) {
      return EMPTY_ALL_REFLECTIONS;
    }
    if (entries.length === _prevReflectionCount) {
      return _prevAllReflections;
    }

    _prevReflectionCount = entries.length;
    _prevAllReflections = entries.sort((a, b) => a.timestamp - b.timestamp);
    return _prevAllReflections;
  });

export const useHealthSnapshot = () =>
  useMissionRuntimeStore((state) => state.healthSnapshot);

export const useSpawnEvents = () =>
  useMissionRuntimeStore((state) => state.spawnEvents ?? EMPTY_SPAWNS);

export const useSpawnedAgents = () =>
  useMissionRuntimeStore(
    useShallow((state) =>
      Object.values(state.agentBoardState).filter(
        (agent) => agent.spawnedBy !== null && agent.spawnedBy !== undefined
      )
    )
  );

export const useReflectingAgents = () =>
  useMissionRuntimeStore(
    useShallow((state) =>
      Object.values(state.agentBoardState).filter((agent) => agent.isReflecting)
    )
  );

export const useStuckAgents = () =>
  useMissionRuntimeStore(
    useShallow((state) =>
      Object.values(state.agentBoardState).filter(
        (agent) => agent.stuckReason !== null && agent.stuckReason !== undefined
      )
    )
  );

export const useMessageCount = (missionId: string) =>
  useMissionRuntimeStore(
    (state) => (state.messagesByMission[missionId] ?? []).length
  );

export const useSelectedApprovalIds = () =>
  useMissionRuntimeStore((state) => state.selectedApprovalIds);

export const useEvictionCursor = (runId: string) =>
  useMissionRuntimeStore((state) => state.evictionCursor[runId] ?? 0);

export {
  applyEventToAgentBoard,
  applyEventToApprovals,
  applyEventToBudget,
  applyEventToMessages,
  applyEventToReflections,
  applyEventToSpawns,
  buildAgentNameIndex,
  resolveEventAgentId,
};
