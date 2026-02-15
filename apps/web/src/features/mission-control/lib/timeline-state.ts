import type { MissionEventLedgerItem } from "@openplane/types/mission-control";

export type TimelineStateBucket =
  | "running_now"
  | "active_reflections"
  | "needs_attention"
  | "recently_completed"
  | "earlier";

type TimelineEventPriority = "critical" | "high" | "medium" | "low";

const RECENT_COMPLETED_WINDOW_MS = 5 * 60_000;
const RECENT_RUNNING_WINDOW_MS = 2 * 60_000;

const NEEDS_ATTENTION_EVENT_TYPES = new Set([
  "orchestrator_failed",
  "mission.failed",
  "budget_exceeded",
  "agent_run_failed",
  "run.failed",
  "tool.failed",
  "approval.requested",
  "agent.replan",
  "agent_replanned",
  "agent.escalated",
  "agent_escalated",
]);

const COMPLETED_EVENT_TYPES = new Set([
  "orchestrator_completed",
  "mission.completed",
  "agent_run_completed",
  "run.completed",
  "tool.completed",
  "task.completed",
  "approval.resolved",
  "artifact.published",
]);

const MISSION_TERMINAL_EVENT_TYPES = new Set([
  "orchestrator_completed",
  "orchestrator_failed",
  "orchestrator_cancelled",
  "mission.completed",
  "mission.failed",
  "mission.cancelled",
  "budget_exceeded",
]);

const OPEN_LIFECYCLE_TERMINALS: Record<string, string[]> = {
  orchestrator_started: [
    "orchestrator_completed",
    "orchestrator_failed",
    "orchestrator_cancelled",
  ],
  "mission.started": [
    "mission.completed",
    "mission.failed",
    "mission.cancelled",
  ],
  "run.started": ["run.completed", "run.failed"],
  agent_run_started: ["agent_run_completed", "agent_run_failed"],
  "tool.started": ["tool.completed", "tool.failed"],
  "task.claimed": ["task.completed"],
  "agent.reflection": ["agent.replan", "agent.escalated"],
  agent_self_evaluated: ["agent_replanned", "agent_escalated"],
};

const RUNNING_SIGNAL_TYPES = new Set([
  "agent_dispatched",
  "task.claimed",
  "chain.progress",
]);

const PRIORITY_BY_EVENT_TYPE: Record<string, TimelineEventPriority> = {
  orchestrator_failed: "critical",
  budget_exceeded: "critical",
  "mission.failed": "critical",
  "agent.escalated": "critical",
  agent_escalated: "critical",
  agent_run_failed: "high",
  "run.failed": "high",
  "tool.failed": "high",
  "approval.requested": "high",
  orchestrator_cancelled: "high",
  orchestrator_started: "high",
  orchestrator_completed: "high",
  "mission.started": "high",
  "mission.completed": "high",
  "mission.cancelled": "high",
  "agent.replan": "high",
  agent_replanned: "high",
  "agent.spawned": "high",
  agent_spawned: "high",
  agent_dispatched: "medium",
  agent_run_started: "medium",
  "run.started": "medium",
  agent_run_completed: "medium",
  "run.completed": "medium",
  agent_step_completed: "medium",
  "task.claimed": "medium",
  "task.completed": "medium",
  "approval.resolved": "medium",
  "artifact.published": "medium",
  "tool.started": "medium",
  "agent.reflection": "medium",
  agent_self_evaluated: "medium",
  "agent.timeout_extended": "medium",
  agent_timeout_extended: "medium",
  "cross_mission.knowledge_imported": "medium",
  "cross_mission.agent_shared": "medium",
  "tool.completed": "low",
  "cost.updated": "low",
  "budget.set": "low",
  "agent.message_sent": "low",
  agent_message_sent: "low",
  "agent.message_received": "low",
  agent_message_received: "low",
  "chain.progress": "low",
};

const STATE_ORDER: TimelineStateBucket[] = [
  "running_now",
  "active_reflections",
  "needs_attention",
  "recently_completed",
  "earlier",
];

const STATE_META: Record<
  TimelineStateBucket,
  { label: string; description: string }
> = {
  running_now: {
    label: "Running now",
    description: "Active work still in flight",
  },
  active_reflections: {
    label: "Active reflections",
    description: "Agents evaluating progress",
  },
  needs_attention: {
    label: "Needs attention",
    description: "Failures, escalations, and blocked decisions",
  },
  recently_completed: {
    label: "Recently completed",
    description: "Latest finished work",
  },
  earlier: {
    label: "Earlier",
    description: "Historical activity",
  },
};

function resolvePriority(eventType: string): TimelineEventPriority {
  return PRIORITY_BY_EVENT_TYPE[eventType] ?? "medium";
}

export type TerminalIndex = {
  byScope: Map<string, number>;
  missionTerminal: number | null;
};

const SCOPE_KEYS: Array<"agentId" | "taskId" | "toolCallId"> = [
  "toolCallId",
  "taskId",
  "agentId",
];

function extractPayloadValue(
  event: MissionEventLedgerItem,
  key: "agentId" | "taskId" | "toolCallId"
): string | undefined {
  const value = event.payload?.[key];
  if (typeof value !== "string" || value.length === 0) {
    return;
  }
  return value;
}

function extractScopeKey(event: MissionEventLedgerItem): string {
  for (const key of SCOPE_KEYS) {
    const value = extractPayloadValue(event, key);
    if (value) {
      return `${key}:${value}`;
    }
  }

  if (event.agentName) {
    return `agentName:${event.agentName}`;
  }

  return "global";
}

export function buildTerminalIndex(
  events: MissionEventLedgerItem[]
): TerminalIndex {
  const byScope = new Map<string, number>();
  let missionTerminal: number | null = null;

  for (const event of events) {
    if (
      MISSION_TERMINAL_EVENT_TYPES.has(event.eventType) &&
      (missionTerminal === null || event.timestamp > missionTerminal)
    ) {
      missionTerminal = event.timestamp;
    }

    for (const [openType, terminalTypes] of Object.entries(
      OPEN_LIFECYCLE_TERMINALS
    )) {
      if (!terminalTypes.includes(event.eventType)) {
        continue;
      }

      const scopeKey = `${openType}:${extractScopeKey(event)}`;
      const existing = byScope.get(scopeKey);
      if (existing === undefined || event.timestamp > existing) {
        byScope.set(scopeKey, event.timestamp);
      }
    }
  }

  return { byScope, missionTerminal };
}

function hasTerminalAfter(
  event: MissionEventLedgerItem,
  index: TerminalIndex
): boolean {
  const terminals = OPEN_LIFECYCLE_TERMINALS[event.eventType];
  if (!terminals) {
    return false;
  }

  const scopeKey = `${event.eventType}:${extractScopeKey(event)}`;
  const terminalTimestamp = index.byScope.get(scopeKey);
  return (
    terminalTimestamp !== undefined && terminalTimestamp >= event.timestamp
  );
}

function hasMissionTerminalAfter(
  event: MissionEventLedgerItem,
  index: TerminalIndex
): boolean {
  return (
    index.missionTerminal !== null && index.missionTerminal >= event.timestamp
  );
}

function isRunningEvent(
  event: MissionEventLedgerItem,
  index: TerminalIndex,
  referenceTimestamp: number
): boolean {
  if (hasMissionTerminalAfter(event, index)) {
    return false;
  }

  if (OPEN_LIFECYCLE_TERMINALS[event.eventType]) {
    return !hasTerminalAfter(event, index);
  }

  if (RUNNING_SIGNAL_TYPES.has(event.eventType)) {
    return referenceTimestamp - event.timestamp <= RECENT_RUNNING_WINDOW_MS;
  }

  return false;
}

export function classifyEventBucket(
  event: MissionEventLedgerItem,
  index: TerminalIndex,
  referenceTimestamp: number,
  missionSettled = false
): TimelineStateBucket {
  const priority = resolvePriority(event.eventType);

  if (
    event.eventType === "agent.reflection" ||
    event.eventType === "agent_self_evaluated"
  ) {
    return missionSettled ? "earlier" : "active_reflections";
  }

  if (
    NEEDS_ATTENTION_EVENT_TYPES.has(event.eventType) ||
    priority === "critical"
  ) {
    return "needs_attention";
  }

  if (isRunningEvent(event, index, referenceTimestamp)) {
    if (missionSettled) {
      return "earlier";
    }
    return "running_now";
  }

  if (
    COMPLETED_EVENT_TYPES.has(event.eventType) &&
    referenceTimestamp - event.timestamp <= RECENT_COMPLETED_WINDOW_MS
  ) {
    return "recently_completed";
  }

  return "earlier";
}

export function sortEventsByTimestampDesc(
  events: MissionEventLedgerItem[]
): MissionEventLedgerItem[] {
  return [...events].sort((a, b) => b.timestamp - a.timestamp);
}

export type TimelineStateSection<T> = {
  bucket: TimelineStateBucket;
  label: string;
  description: string;
  rows: T[];
};

export function buildStateSections<T extends { bucket: TimelineStateBucket }>(
  rows: T[]
): TimelineStateSection<T>[] {
  const grouped = new Map<TimelineStateBucket, T[]>();

  for (const row of rows) {
    const existing = grouped.get(row.bucket);
    if (existing) {
      existing.push(row);
    } else {
      grouped.set(row.bucket, [row]);
    }
  }

  return STATE_ORDER.map((bucket) => ({
    bucket,
    label: STATE_META[bucket].label,
    description: STATE_META[bucket].description,
    rows: grouped.get(bucket) ?? [],
  }));
}
