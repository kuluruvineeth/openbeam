import type { MissionEventLedgerItem } from "@openplane/types/mission-control";

export type TimelineStateBucket =
  | "running_now"
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
};

const RUNNING_SIGNAL_TYPES = new Set(["agent_dispatched", "task.claimed"]);

const PRIORITY_BY_EVENT_TYPE: Record<string, TimelineEventPriority> = {
  orchestrator_failed: "critical",
  budget_exceeded: "critical",
  agent_run_failed: "high",
  "run.failed": "high",
  "tool.failed": "high",
  "approval.requested": "high",
  orchestrator_cancelled: "high",
  orchestrator_started: "high",
  orchestrator_completed: "high",
  "mission.started": "high",
  "mission.completed": "high",
  "mission.failed": "critical",
  "mission.cancelled": "high",
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
  "tool.completed": "low",
  "cost.updated": "low",
  "budget.set": "low",
};

const STATE_ORDER: TimelineStateBucket[] = [
  "running_now",
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
  needs_attention: {
    label: "Needs attention",
    description: "Failures and blocked decisions",
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

function matchesLifecycleScope(
  start: MissionEventLedgerItem,
  candidate: MissionEventLedgerItem
): boolean {
  const scopeKeys: Array<"agentId" | "taskId" | "toolCallId"> = [
    "toolCallId",
    "taskId",
    "agentId",
  ];

  let scoped = false;
  for (const key of scopeKeys) {
    const startValue = extractPayloadValue(start, key);
    if (!startValue) {
      continue;
    }
    scoped = true;
    if (extractPayloadValue(candidate, key) !== startValue) {
      return false;
    }
  }

  if (scoped) {
    return true;
  }

  if (start.agentName && candidate.agentName) {
    return start.agentName === candidate.agentName;
  }

  return true;
}

function hasTerminalAfter(
  event: MissionEventLedgerItem,
  allEvents: MissionEventLedgerItem[]
): boolean {
  const terminals = OPEN_LIFECYCLE_TERMINALS[event.eventType];
  if (!terminals) {
    return false;
  }

  return allEvents.some(
    (candidate) =>
      candidate.timestamp >= event.timestamp &&
      terminals.includes(candidate.eventType) &&
      matchesLifecycleScope(event, candidate)
  );
}

function hasMissionTerminalAfter(
  event: MissionEventLedgerItem,
  allEvents: MissionEventLedgerItem[]
): boolean {
  return allEvents.some(
    (candidate) =>
      candidate.timestamp >= event.timestamp &&
      MISSION_TERMINAL_EVENT_TYPES.has(candidate.eventType)
  );
}

function isRunningEvent(
  event: MissionEventLedgerItem,
  allEvents: MissionEventLedgerItem[],
  referenceTimestamp: number
): boolean {
  if (hasMissionTerminalAfter(event, allEvents)) {
    return false;
  }

  if (OPEN_LIFECYCLE_TERMINALS[event.eventType]) {
    return !hasTerminalAfter(event, allEvents);
  }

  if (RUNNING_SIGNAL_TYPES.has(event.eventType)) {
    return referenceTimestamp - event.timestamp <= RECENT_RUNNING_WINDOW_MS;
  }

  return false;
}

export function classifyEventBucket(
  event: MissionEventLedgerItem,
  allEvents: MissionEventLedgerItem[],
  referenceTimestamp: number,
  missionSettled = false
): TimelineStateBucket {
  const priority = resolvePriority(event.eventType);

  if (
    NEEDS_ATTENTION_EVENT_TYPES.has(event.eventType) ||
    priority === "critical"
  ) {
    return "needs_attention";
  }

  if (isRunningEvent(event, allEvents, referenceTimestamp)) {
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
    const bucketRows = grouped.get(row.bucket);
    if (bucketRows) {
      bucketRows.push(row);
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
