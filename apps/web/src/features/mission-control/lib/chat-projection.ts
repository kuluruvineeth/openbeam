import type {
  AgentMessageItem,
  MissionEventLedgerItem,
  ReflectionHistoryEntry,
} from "@openplane/types/mission-control";

type ChatMessage = {
  id: string;
  agentId: string;
  agentName: string;
  agentRole?: string;
  content: string;
  timestamp: number;
  status: "streaming" | "complete";
};

type ChatStatusLine = {
  id: string;
  kind:
    | "join"
    | "complete"
    | "error"
    | "delegation"
    | "replan"
    | "spawn"
    | "escalation";
  agentName: string;
  targetAgentName?: string;
  content: string;
  timestamp: number;
};

type ChatCommsItem = {
  id: string;
  fromAgentName: string;
  toAgentName: string | null;
  channel: "direct" | "broadcast" | "cross_mission";
  content: string;
  isReply: boolean;
  sourceMissionName?: string;
  timestamp: number;
};

type ChatReflectionItem = {
  id: string;
  agentId: string;
  agentName: string;
  score: number;
  verbalMemory: string;
  triggeredReplan: boolean;
  timestamp: number;
};

type ChatEntry =
  | { type: "message"; data: ChatMessage }
  | { type: "status"; data: ChatStatusLine }
  | { type: "comms"; data: ChatCommsItem }
  | { type: "reflection"; data: ChatReflectionItem };

const STATUS_EVENT_TYPES = new Set([
  "agent_run_started",
  "run.started",
  "agent_completed",
  "run.completed",
  "agent_dispatched",
  "agent_failed",
  "agent_run_failed",
  "run.failed",
]);

const SPAWN_EVENT_TYPES = new Set(["agent_spawned", "agent.spawned"]);
const REPLAN_EVENT_TYPES = new Set([
  "agent_replan",
  "agent.replan",
  "agent_replanned",
]);
const ESCALATION_EVENT_TYPES = new Set(["agent.escalated", "agent_escalated"]);

const NOISE_EVENT_TYPES = new Set([
  "agent_tool_call",
  "tool_call_completed",
  "tool.started",
  "tool.completed",
  "tool.failed",
  "agent_message_sent",
  "agent_message_received",
  "agent.message_sent",
  "agent.message_received",
  "agent_reflection",
  "agent.reflection",
  "agent_self_evaluated",
]);

const EXECUTED_TOOLS_PATTERN = /^Executed \d+ tools?$/;
const GENERIC_THINKING_PATTERN = /^Thinking\.{0,3}$/;

const EVENT_MERGE_WINDOW_MS = 8000;

function projectStatusLine(
  event: MissionEventLedgerItem,
  agentBoard: Record<string, { agentName: string }>
): ChatStatusLine {
  const agentName = event.agentName ?? "Agent";

  if (SPAWN_EVENT_TYPES.has(event.eventType)) {
    const targetName =
      agentBoard[event.payload?.childAgentId as string]?.agentName ??
      agentBoard[event.payload?.spawnedAgentId as string]?.agentName ??
      (event.payload?.childAgentName as string | undefined) ??
      agentName;
    return {
      id: `status-${event.eventId}`,
      kind: "spawn",
      agentName: event.payload?.parentAgentName
        ? String(event.payload.parentAgentName)
        : "Orchestrator",
      targetAgentName: targetName,
      content: `Spawned ${targetName}`,
      timestamp: event.timestamp,
    };
  }

  if (ESCALATION_EVENT_TYPES.has(event.eventType)) {
    const reason = (event.payload?.reason as string) ?? "needs help";
    return {
      id: `status-${event.eventId}`,
      kind: "escalation",
      agentName,
      content: `${agentName} escalated: ${reason}`,
      timestamp: event.timestamp,
    };
  }

  if (REPLAN_EVENT_TYPES.has(event.eventType)) {
    return {
      id: `status-${event.eventId}`,
      kind: "replan",
      agentName,
      content: `${agentName} is replanning`,
      timestamp: event.timestamp,
    };
  }

  switch (event.eventType) {
    case "agent_run_started":
    case "run.started":
      return {
        id: `status-${event.eventId}`,
        kind: "join",
        agentName,
        content: `${agentName} started working`,
        timestamp: event.timestamp,
      };
    case "agent_dispatched": {
      const targetName =
        agentBoard[event.payload?.agentId as string]?.agentName ??
        (event.payload?.agentName as string | undefined) ??
        "Agent";
      return {
        id: `status-${event.eventId}`,
        kind: "delegation",
        agentName: "Orchestrator",
        targetAgentName: targetName,
        content: event.payload?.taskTitle
          ? `Assigned "${event.payload.taskTitle}" to ${targetName}`
          : `Dispatched ${targetName}`,
        timestamp: event.timestamp,
      };
    }
    case "agent_completed":
    case "run.completed":
      return {
        id: `status-${event.eventId}`,
        kind: "complete",
        agentName,
        content: `${agentName} finished`,
        timestamp: event.timestamp,
      };
    case "agent_failed":
    case "agent_run_failed":
    case "run.failed":
      return {
        id: `status-${event.eventId}`,
        kind: "error",
        agentName,
        content:
          (event.payload?.error as string) ??
          (event.payload?.errorMessage as string) ??
          `${agentName} encountered an error`,
        timestamp: event.timestamp,
      };
    default:
      return {
        id: `status-${event.eventId}`,
        kind: "join",
        agentName,
        content: agentName,
        timestamp: event.timestamp,
      };
  }
}

function isNoiseEvent(event: MissionEventLedgerItem): boolean {
  if (NOISE_EVENT_TYPES.has(event.eventType)) {
    return true;
  }

  if (event.eventType === "agent_step_started") {
    const content = (event.payload?.content as string) ?? "";
    if (GENERIC_THINKING_PATTERN.test(content) || content.length === 0) {
      return true;
    }
  }

  if (event.eventType === "agent_step_completed") {
    const summary =
      (event.payload?.summary as string) ??
      (event.payload?.content as string) ??
      event.summary;
    if (EXECUTED_TOOLS_PATTERN.test(summary)) {
      return true;
    }
    if (!summary || summary.length === 0) {
      return true;
    }
  }

  return false;
}

function extractMessageContent(event: MissionEventLedgerItem): string | null {
  if (event.eventType === "agent_step_completed") {
    const summary =
      (event.payload?.summary as string) ??
      (event.payload?.content as string) ??
      event.summary;
    if (
      summary &&
      summary.length > 0 &&
      !EXECUTED_TOOLS_PATTERN.test(summary)
    ) {
      return summary;
    }
    return null;
  }

  if (event.eventType === "agent_step_started") {
    const content = (event.payload?.content as string) ?? "";
    if (content.length > 0 && !GENERIC_THINKING_PATTERN.test(content)) {
      return content;
    }
    return null;
  }

  return null;
}

function projectEventsToEntries(
  events: MissionEventLedgerItem[],
  filterName: string | null,
  agentBoard: Record<string, { agentName: string; role?: string }>
): ChatEntry[] {
  const filtered = events.filter(
    (e) => !filterName || e.agentName === filterName
  );

  const entries: ChatEntry[] = [];
  let currentMessage: ChatMessage | null = null;

  for (const event of filtered) {
    const isStatus =
      STATUS_EVENT_TYPES.has(event.eventType) ||
      SPAWN_EVENT_TYPES.has(event.eventType) ||
      REPLAN_EVENT_TYPES.has(event.eventType) ||
      ESCALATION_EVENT_TYPES.has(event.eventType);

    if (isStatus) {
      if (currentMessage) {
        currentMessage.status = "complete";
        entries.push({ type: "message", data: currentMessage });
        currentMessage = null;
      }
      entries.push({
        type: "status",
        data: projectStatusLine(event, agentBoard),
      });
      continue;
    }

    if (isNoiseEvent(event)) {
      continue;
    }

    const content = extractMessageContent(event);
    if (!content) {
      continue;
    }

    const agentName = event.agentName ?? "Agent";
    const agentId = (event.payload?.agentId as string) ?? agentName;
    const isSameAgent =
      currentMessage !== null && currentMessage.agentId === agentId;
    const isWithinWindow =
      currentMessage !== null &&
      event.timestamp - currentMessage.timestamp < EVENT_MERGE_WINDOW_MS;

    if (currentMessage && isSameAgent && isWithinWindow) {
      currentMessage.content += `\n\n${content}`;
    } else {
      if (currentMessage) {
        currentMessage.status = "complete";
        entries.push({ type: "message", data: currentMessage });
      }
      currentMessage = {
        id: `msg-${event.eventId}`,
        agentId,
        agentName,
        agentRole: agentBoard[agentId]?.role,
        content,
        timestamp: event.timestamp,
        status: "streaming",
      };
    }
  }

  if (currentMessage) {
    entries.push({ type: "message", data: currentMessage });
  }

  return entries;
}

function projectMessagesToEntries(
  messages: AgentMessageItem[],
  agentFilter: string | null,
  agentBoard: Record<string, { agentName: string }>
): ChatEntry[] {
  const filterName = agentFilter
    ? (agentBoard[agentFilter]?.agentName ?? null)
    : null;

  const filtered = messages.filter((msg) => {
    if (!filterName) {
      return true;
    }
    return msg.fromAgentName === filterName || msg.toAgentName === filterName;
  });

  return filtered.map((msg) => ({
    type: "comms" as const,
    data: {
      id: `comms-${msg.messageId}`,
      fromAgentName: msg.fromAgentName,
      toAgentName: msg.toAgentName,
      channel: msg.channel,
      content: msg.fullContent ?? msg.contentPreview,
      isReply:
        msg.replyToMessageId !== null && msg.replyToMessageId !== undefined,
      sourceMissionName: msg.sourceMissionName,
      timestamp: msg.timestamp,
    },
  }));
}

function projectReflectionsToEntries(
  reflections: ReflectionHistoryEntry[],
  agentFilter: string | null,
  agentBoard: Record<string, { agentName: string }>
): ChatEntry[] {
  const filtered = reflections.filter(
    (ref) => !agentFilter || ref.agentId === agentFilter
  );

  return filtered.map((ref) => ({
    type: "reflection" as const,
    data: {
      id: `ref-${ref.entryId}`,
      agentId: ref.agentId,
      agentName: agentBoard[ref.agentId]?.agentName ?? ref.agentName,
      score: ref.score,
      verbalMemory: ref.verbalMemory,
      triggeredReplan: ref.triggeredReplan,
      timestamp: ref.timestamp,
    },
  }));
}

type ChatProjectionInput = {
  events: MissionEventLedgerItem[];
  messages: AgentMessageItem[];
  reflections: ReflectionHistoryEntry[];
  agentFilter: string | null;
  agentBoard: Record<string, { agentName: string; role?: string }>;
};

function projectChatFeed(input: ChatProjectionInput): ChatEntry[] {
  const filterName = input.agentFilter
    ? (input.agentBoard[input.agentFilter]?.agentName ?? null)
    : null;

  const eventEntries = projectEventsToEntries(
    input.events,
    filterName,
    input.agentBoard
  );
  const commsEntries = projectMessagesToEntries(
    input.messages,
    input.agentFilter,
    input.agentBoard
  );
  const reflectionEntries = projectReflectionsToEntries(
    input.reflections,
    input.agentFilter,
    input.agentBoard
  );

  const merged = [...eventEntries, ...commsEntries, ...reflectionEntries];
  merged.sort((a, b) => a.data.timestamp - b.data.timestamp);

  return mergeConsecutiveEntries(merged);
}

function mergeConsecutiveEntries(entries: ChatEntry[]): ChatEntry[] {
  const result: ChatEntry[] = [];

  for (const entry of entries) {
    const prev = result.at(-1);

    if (
      entry.type === "message" &&
      prev?.type === "message" &&
      prev.data.agentId === entry.data.agentId &&
      entry.data.timestamp - prev.data.timestamp < EVENT_MERGE_WINDOW_MS
    ) {
      prev.data.content += `\n\n${entry.data.content}`;
      prev.data.status = entry.data.status;
      continue;
    }

    if (
      entry.type === "reflection" &&
      prev?.type === "reflection" &&
      prev.data.agentId === entry.data.agentId &&
      entry.data.timestamp - prev.data.timestamp < EVENT_MERGE_WINDOW_MS
    ) {
      prev.data.score = entry.data.score;
      prev.data.triggeredReplan =
        prev.data.triggeredReplan || entry.data.triggeredReplan;
      if (entry.data.verbalMemory !== prev.data.verbalMemory) {
        prev.data.verbalMemory = entry.data.verbalMemory;
      }
      continue;
    }

    result.push(entry);
  }

  return result;
}

type ProjectionFingerprint = {
  eventCount: number;
  lastEventTs: number;
  messageCount: number;
  lastMessageTs: number;
  reflectionCount: number;
  lastReflectionTs: number;
  agentFilter: string | null;
  agentKeyCount: number;
};

function fingerprintsEqual(
  a: ProjectionFingerprint,
  b: ProjectionFingerprint
): boolean {
  return (
    a.eventCount === b.eventCount &&
    a.lastEventTs === b.lastEventTs &&
    a.messageCount === b.messageCount &&
    a.lastMessageTs === b.lastMessageTs &&
    a.reflectionCount === b.reflectionCount &&
    a.lastReflectionTs === b.lastReflectionTs &&
    a.agentFilter === b.agentFilter &&
    a.agentKeyCount === b.agentKeyCount
  );
}

function computeFingerprint(input: ChatProjectionInput): ProjectionFingerprint {
  return {
    eventCount: input.events.length,
    lastEventTs: input.events.at(-1)?.timestamp ?? 0,
    messageCount: input.messages.length,
    lastMessageTs: input.messages.at(-1)?.timestamp ?? 0,
    reflectionCount: input.reflections.length,
    lastReflectionTs: input.reflections.at(-1)?.timestamp ?? 0,
    agentFilter: input.agentFilter,
    agentKeyCount: Object.keys(input.agentBoard).length,
  };
}

function createChatProjectionCache(): (
  input: ChatProjectionInput
) => ChatEntry[] {
  let cachedResult: ChatEntry[] = [];
  let lastFingerprint: ProjectionFingerprint | null = null;

  return function project(input: ChatProjectionInput): ChatEntry[] {
    const fingerprint = computeFingerprint(input);

    if (
      lastFingerprint !== null &&
      fingerprintsEqual(lastFingerprint, fingerprint)
    ) {
      return cachedResult;
    }

    cachedResult = projectChatFeed(input);
    lastFingerprint = fingerprint;
    return cachedResult;
  };
}

export {
  projectChatFeed,
  createChatProjectionCache,
  computeFingerprint,
  fingerprintsEqual,
  EVENT_MERGE_WINDOW_MS,
};
export type {
  ChatMessage,
  ChatStatusLine,
  ChatCommsItem,
  ChatReflectionItem,
  ChatEntry,
  ChatProjectionInput,
  ProjectionFingerprint,
};
