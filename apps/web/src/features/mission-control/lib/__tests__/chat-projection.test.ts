import { describe, expect, it } from "bun:test";
import type {
  AgentMessageItem,
  MissionEventLedgerItem,
  ReflectionHistoryEntry,
} from "@openplane/types/mission-control";
import {
  type ChatEntry,
  EVENT_MERGE_WINDOW_MS,
  projectChatFeed,
} from "../chat-projection";

const BASE_TS = 1_700_000_000_000;

function ledgerItem(
  overrides: Partial<MissionEventLedgerItem> & {
    eventType: string;
    timestamp: number;
  }
): MissionEventLedgerItem {
  return {
    eventId: `evt-${overrides.timestamp}`,
    missionId: "m-1",
    runId: "r-1",
    lane: "linear",
    sequence: 1,
    summary: "",
    ...overrides,
  };
}

function messageItem(
  overrides: Partial<AgentMessageItem> & { timestamp: number }
): AgentMessageItem {
  return {
    messageId: `msg-${overrides.timestamp}`,
    missionId: "m-1",
    fromAgentId: "agent-1",
    fromAgentName: "Researcher",
    toAgentId: null,
    toAgentName: null,
    channel: "direct",
    contentPreview: "Hello",
    replyToMessageId: null,
    ...overrides,
  };
}

function reflectionItem(
  overrides: Partial<ReflectionHistoryEntry> & { timestamp: number }
): ReflectionHistoryEntry {
  return {
    entryId: `ref-${overrides.timestamp}`,
    agentId: "agent-1",
    agentName: "Researcher",
    stepNumber: 1,
    score: 0.75,
    verbalMemory: "Making progress",
    triggeredReplan: false,
    ...overrides,
  };
}

const AGENT_BOARD = {
  "agent-1": { agentName: "Researcher", role: "research" },
  "agent-2": { agentName: "Writer", role: "writing" },
};

const EMPTY_MESSAGES: AgentMessageItem[] = [];
const EMPTY_REFLECTIONS: ReflectionHistoryEntry[] = [];

describe("projectChatFeed", () => {
  it("converts status events to status entries", () => {
    const entries = projectChatFeed({
      events: [
        ledgerItem({
          eventType: "agent_run_started",
          timestamp: BASE_TS,
          agentName: "Researcher",
        }),
      ],
      messages: EMPTY_MESSAGES,
      reflections: EMPTY_REFLECTIONS,
      agentFilter: null,
      agentBoard: AGENT_BOARD,
    });

    expect(entries).toHaveLength(1);
    expect(entries[0]?.type).toBe("status");
    const status = entries[0] as Extract<ChatEntry, { type: "status" }>;
    expect(status.data.kind).toBe("join");
    expect(status.data.content).toBe("Researcher started working");
  });

  it("keeps real text from agent_step_completed as message", () => {
    const entries = projectChatFeed({
      events: [
        ledgerItem({
          eventType: "agent_step_completed",
          timestamp: BASE_TS,
          agentName: "Researcher",
          payload: {
            agentId: "agent-1",
            summary: "Found 5 relevant documents about pricing",
          },
        }),
      ],
      messages: EMPTY_MESSAGES,
      reflections: EMPTY_REFLECTIONS,
      agentFilter: null,
      agentBoard: AGENT_BOARD,
    });

    expect(entries).toHaveLength(1);
    expect(entries[0]?.type).toBe("message");
    const msg = entries[0] as Extract<ChatEntry, { type: "message" }>;
    expect(msg.data.content).toBe("Found 5 relevant documents about pricing");
  });

  it("filters out 'Executed N tools' noise", () => {
    const entries = projectChatFeed({
      events: [
        ledgerItem({
          eventType: "agent_step_completed",
          timestamp: BASE_TS,
          agentName: "Researcher",
          payload: { agentId: "agent-1", summary: "Executed 10 tools" },
        }),
        ledgerItem({
          eventType: "agent_step_completed",
          timestamp: BASE_TS + 1000,
          agentName: "Researcher",
          payload: { agentId: "agent-1", summary: "Executed 1 tool" },
        }),
      ],
      messages: EMPTY_MESSAGES,
      reflections: EMPTY_REFLECTIONS,
      agentFilter: null,
      agentBoard: AGENT_BOARD,
    });

    expect(entries).toHaveLength(0);
  });

  it("filters out tool_call and tool_call_completed events", () => {
    const entries = projectChatFeed({
      events: [
        ledgerItem({
          eventType: "agent_tool_call",
          timestamp: BASE_TS,
          agentName: "Researcher",
          payload: { agentId: "agent-1", toolName: "search_hybrid" },
        }),
        ledgerItem({
          eventType: "tool_call_completed",
          timestamp: BASE_TS + 500,
          agentName: "Researcher",
          payload: { agentId: "agent-1", toolName: "search_hybrid" },
        }),
      ],
      messages: EMPTY_MESSAGES,
      reflections: EMPTY_REFLECTIONS,
      agentFilter: null,
      agentBoard: AGENT_BOARD,
    });

    expect(entries).toHaveLength(0);
  });

  it("filters out generic 'Thinking...' events", () => {
    const entries = projectChatFeed({
      events: [
        ledgerItem({
          eventType: "agent_step_started",
          timestamp: BASE_TS,
          agentName: "Researcher",
          payload: { agentId: "agent-1", content: "Thinking..." },
        }),
      ],
      messages: EMPTY_MESSAGES,
      reflections: EMPTY_REFLECTIONS,
      agentFilter: null,
      agentBoard: AGENT_BOARD,
    });

    expect(entries).toHaveLength(0);
  });

  it("keeps agent_step_started with meaningful content", () => {
    const entries = projectChatFeed({
      events: [
        ledgerItem({
          eventType: "agent_step_started",
          timestamp: BASE_TS,
          agentName: "Researcher",
          payload: {
            agentId: "agent-1",
            content: "Analyzing quarterly revenue data across 3 connectors",
          },
        }),
      ],
      messages: EMPTY_MESSAGES,
      reflections: EMPTY_REFLECTIONS,
      agentFilter: null,
      agentBoard: AGENT_BOARD,
    });

    expect(entries).toHaveLength(1);
    expect(entries[0]?.type).toBe("message");
  });

  it("merges consecutive messages from same agent within window", () => {
    const entries = projectChatFeed({
      events: [
        ledgerItem({
          eventType: "agent_step_completed",
          timestamp: BASE_TS,
          agentName: "Researcher",
          payload: { agentId: "agent-1", summary: "Part 1" },
        }),
        ledgerItem({
          eventType: "agent_step_completed",
          timestamp: BASE_TS + 2000,
          agentName: "Researcher",
          payload: { agentId: "agent-1", summary: "Part 2" },
        }),
      ],
      messages: EMPTY_MESSAGES,
      reflections: EMPTY_REFLECTIONS,
      agentFilter: null,
      agentBoard: AGENT_BOARD,
    });

    expect(entries).toHaveLength(1);
    expect(entries[0]?.type).toBe("message");
    const msg = entries[0] as Extract<ChatEntry, { type: "message" }>;
    expect(msg.data.content).toContain("Part 1");
    expect(msg.data.content).toContain("Part 2");
  });

  it("splits messages when agent changes", () => {
    const entries = projectChatFeed({
      events: [
        ledgerItem({
          eventType: "agent_step_completed",
          timestamp: BASE_TS,
          agentName: "Researcher",
          payload: { agentId: "agent-1", summary: "Done researching" },
        }),
        ledgerItem({
          eventType: "agent_step_completed",
          timestamp: BASE_TS + 1000,
          agentName: "Writer",
          payload: { agentId: "agent-2", summary: "Starting draft" },
        }),
      ],
      messages: EMPTY_MESSAGES,
      reflections: EMPTY_REFLECTIONS,
      agentFilter: null,
      agentBoard: AGENT_BOARD,
    });

    expect(entries).toHaveLength(2);
    const msg1 = entries[0] as Extract<ChatEntry, { type: "message" }>;
    const msg2 = entries[1] as Extract<ChatEntry, { type: "message" }>;
    expect(msg1.data.agentName).toBe("Researcher");
    expect(msg2.data.agentName).toBe("Writer");
  });

  it("splits messages when merge window expires", () => {
    const entries = projectChatFeed({
      events: [
        ledgerItem({
          eventType: "agent_step_completed",
          timestamp: BASE_TS,
          agentName: "Researcher",
          payload: { agentId: "agent-1", summary: "Part 1" },
        }),
        ledgerItem({
          eventType: "agent_step_completed",
          timestamp: BASE_TS + EVENT_MERGE_WINDOW_MS + 1,
          agentName: "Researcher",
          payload: { agentId: "agent-1", summary: "Part 2" },
        }),
      ],
      messages: EMPTY_MESSAGES,
      reflections: EMPTY_REFLECTIONS,
      agentFilter: null,
      agentBoard: AGENT_BOARD,
    });

    expect(entries).toHaveLength(2);
  });

  it("filters by selected agent", () => {
    const entries = projectChatFeed({
      events: [
        ledgerItem({
          eventType: "agent_step_completed",
          timestamp: BASE_TS,
          agentName: "Researcher",
          payload: { agentId: "agent-1", summary: "Research stuff" },
        }),
        ledgerItem({
          eventType: "agent_step_completed",
          timestamp: BASE_TS + 1000,
          agentName: "Writer",
          payload: { agentId: "agent-2", summary: "Write stuff" },
        }),
      ],
      messages: EMPTY_MESSAGES,
      reflections: EMPTY_REFLECTIONS,
      agentFilter: "agent-1",
      agentBoard: AGENT_BOARD,
    });

    expect(entries).toHaveLength(1);
    const msg = entries[0] as Extract<ChatEntry, { type: "message" }>;
    expect(msg.data.agentName).toBe("Researcher");
  });

  it("interleaves status and message entries", () => {
    const entries = projectChatFeed({
      events: [
        ledgerItem({
          eventType: "agent_run_started",
          timestamp: BASE_TS,
          agentName: "Researcher",
        }),
        ledgerItem({
          eventType: "agent_step_completed",
          timestamp: BASE_TS + 1000,
          agentName: "Researcher",
          payload: { agentId: "agent-1", summary: "Found data" },
        }),
        ledgerItem({
          eventType: "agent_completed",
          timestamp: BASE_TS + 5000,
          agentName: "Researcher",
        }),
      ],
      messages: EMPTY_MESSAGES,
      reflections: EMPTY_REFLECTIONS,
      agentFilter: null,
      agentBoard: AGENT_BOARD,
    });

    expect(entries).toHaveLength(3);
    expect(entries[0]?.type).toBe("status");
    expect(entries[1]?.type).toBe("message");
    expect(entries[2]?.type).toBe("status");
  });

  it("maps delegation events to status lines", () => {
    const entries = projectChatFeed({
      events: [
        ledgerItem({
          eventType: "agent_dispatched",
          timestamp: BASE_TS,
          agentName: "Researcher",
          payload: {
            agentId: "agent-1",
            taskTitle: "Research pricing data",
          },
        }),
      ],
      messages: EMPTY_MESSAGES,
      reflections: EMPTY_REFLECTIONS,
      agentFilter: null,
      agentBoard: AGENT_BOARD,
    });

    expect(entries).toHaveLength(1);
    const status = entries[0] as Extract<ChatEntry, { type: "status" }>;
    expect(status.data.kind).toBe("delegation");
    expect(status.data.content).toContain("Research pricing data");
  });

  it("handles empty inputs", () => {
    const entries = projectChatFeed({
      events: [],
      messages: EMPTY_MESSAGES,
      reflections: EMPTY_REFLECTIONS,
      agentFilter: null,
      agentBoard: AGENT_BOARD,
    });
    expect(entries).toHaveLength(0);
  });

  it("marks last message as streaming", () => {
    const entries = projectChatFeed({
      events: [
        ledgerItem({
          eventType: "agent_step_completed",
          timestamp: BASE_TS,
          agentName: "Researcher",
          payload: { agentId: "agent-1", summary: "Still working" },
        }),
      ],
      messages: EMPTY_MESSAGES,
      reflections: EMPTY_REFLECTIONS,
      agentFilter: null,
      agentBoard: AGENT_BOARD,
    });

    const msg = entries[0] as Extract<ChatEntry, { type: "message" }>;
    expect(msg.data.status).toBe("streaming");
  });

  it("marks non-last messages as complete", () => {
    const entries = projectChatFeed({
      events: [
        ledgerItem({
          eventType: "agent_step_completed",
          timestamp: BASE_TS,
          agentName: "Researcher",
          payload: { agentId: "agent-1", summary: "Part 1" },
        }),
        ledgerItem({
          eventType: "agent_run_started",
          timestamp: BASE_TS + 2000,
          agentName: "Writer",
        }),
      ],
      messages: EMPTY_MESSAGES,
      reflections: EMPTY_REFLECTIONS,
      agentFilter: null,
      agentBoard: AGENT_BOARD,
    });

    const msg = entries[0] as Extract<ChatEntry, { type: "message" }>;
    expect(msg.data.status).toBe("complete");
  });

  it("handles consecutive status events without message between", () => {
    const entries = projectChatFeed({
      events: [
        ledgerItem({
          eventType: "agent_run_started",
          timestamp: BASE_TS,
          agentName: "Researcher",
        }),
        ledgerItem({
          eventType: "agent_spawned",
          timestamp: BASE_TS + 500,
          agentName: "Orchestrator",
          payload: { childAgentId: "agent-1" },
        }),
        ledgerItem({
          eventType: "agent_completed",
          timestamp: BASE_TS + 1000,
          agentName: "Researcher",
        }),
      ],
      messages: EMPTY_MESSAGES,
      reflections: EMPTY_REFLECTIONS,
      agentFilter: null,
      agentBoard: AGENT_BOARD,
    });

    expect(entries).toHaveLength(3);
    expect(entries.every((e) => e.type === "status")).toBe(true);
  });

  it("defaults agentName to Agent when missing", () => {
    const entries = projectChatFeed({
      events: [
        ledgerItem({
          eventType: "agent_run_started",
          timestamp: BASE_TS,
        }),
      ],
      messages: EMPTY_MESSAGES,
      reflections: EMPTY_REFLECTIONS,
      agentFilter: null,
      agentBoard: AGENT_BOARD,
    });

    const status = entries[0] as Extract<ChatEntry, { type: "status" }>;
    expect(status.data.agentName).toBe("Agent");
    expect(status.data.content).toBe("Agent started working");
  });

  it("maps agent_spawned to spawn status line", () => {
    const entries = projectChatFeed({
      events: [
        ledgerItem({
          eventType: "agent_spawned",
          timestamp: BASE_TS,
          agentName: "Orchestrator",
          payload: { childAgentId: "agent-1", childAgentName: "Researcher" },
        }),
      ],
      messages: EMPTY_MESSAGES,
      reflections: EMPTY_REFLECTIONS,
      agentFilter: null,
      agentBoard: AGENT_BOARD,
    });

    expect(entries).toHaveLength(1);
    const status = entries[0] as Extract<ChatEntry, { type: "status" }>;
    expect(status.data.kind).toBe("spawn");
    expect(status.data.content).toContain("Researcher");
  });

  it("maps agent_escalated to escalation status line", () => {
    const entries = projectChatFeed({
      events: [
        ledgerItem({
          eventType: "agent_escalated",
          timestamp: BASE_TS,
          agentName: "Researcher",
          payload: { reason: "Cannot access API" },
        }),
      ],
      messages: EMPTY_MESSAGES,
      reflections: EMPTY_REFLECTIONS,
      agentFilter: null,
      agentBoard: AGENT_BOARD,
    });

    expect(entries).toHaveLength(1);
    const status = entries[0] as Extract<ChatEntry, { type: "status" }>;
    expect(status.data.kind).toBe("escalation");
    expect(status.data.content).toContain("Cannot access API");
  });

  it("includes inter-agent messages as comms entries", () => {
    const entries = projectChatFeed({
      events: [],
      messages: [
        messageItem({
          timestamp: BASE_TS,
          fromAgentName: "Researcher",
          toAgentName: "Writer",
          toAgentId: "agent-2",
          channel: "direct",
          contentPreview: "Here are my findings",
          fullContent: "Here are my findings on pricing",
        }),
      ],
      reflections: EMPTY_REFLECTIONS,
      agentFilter: null,
      agentBoard: AGENT_BOARD,
    });

    expect(entries).toHaveLength(1);
    expect(entries[0]?.type).toBe("comms");
    const comms = entries[0] as Extract<ChatEntry, { type: "comms" }>;
    expect(comms.data.fromAgentName).toBe("Researcher");
    expect(comms.data.toAgentName).toBe("Writer");
    expect(comms.data.content).toBe("Here are my findings on pricing");
  });

  it("includes reflections as reflection entries", () => {
    const entries = projectChatFeed({
      events: [],
      messages: EMPTY_MESSAGES,
      reflections: [
        reflectionItem({
          timestamp: BASE_TS,
          agentName: "Researcher",
          score: 0.85,
          verbalMemory: "Good progress on research task",
        }),
      ],
      agentFilter: null,
      agentBoard: AGENT_BOARD,
    });

    expect(entries).toHaveLength(1);
    expect(entries[0]?.type).toBe("reflection");
    const ref = entries[0] as Extract<ChatEntry, { type: "reflection" }>;
    expect(ref.data.agentName).toBe("Researcher");
    expect(ref.data.score).toBe(0.85);
    expect(ref.data.verbalMemory).toBe("Good progress on research task");
  });

  it("merges all 3 sources chronologically", () => {
    const entries = projectChatFeed({
      events: [
        ledgerItem({
          eventType: "agent_run_started",
          timestamp: BASE_TS,
          agentName: "Researcher",
        }),
        ledgerItem({
          eventType: "agent_step_completed",
          timestamp: BASE_TS + 3000,
          agentName: "Researcher",
          payload: { agentId: "agent-1", summary: "Found results" },
        }),
      ],
      messages: [
        messageItem({
          timestamp: BASE_TS + 2000,
          fromAgentName: "Researcher",
          toAgentName: "Writer",
          toAgentId: "agent-2",
          contentPreview: "Check this out",
        }),
      ],
      reflections: [
        reflectionItem({
          timestamp: BASE_TS + 4000,
          score: 0.9,
          verbalMemory: "Task nearly complete",
        }),
      ],
      agentFilter: null,
      agentBoard: AGENT_BOARD,
    });

    expect(entries).toHaveLength(4);
    expect(entries[0]?.type).toBe("status");
    expect(entries[1]?.type).toBe("comms");
    expect(entries[2]?.type).toBe("message");
    expect(entries[3]?.type).toBe("reflection");
  });

  it("filters comms by agent name", () => {
    const entries = projectChatFeed({
      events: [],
      messages: [
        messageItem({
          timestamp: BASE_TS,
          fromAgentName: "Researcher",
          toAgentName: "Writer",
          toAgentId: "agent-2",
          contentPreview: "For Writer",
        }),
        messageItem({
          timestamp: BASE_TS + 1000,
          messageId: "msg-other",
          fromAgentId: "agent-3",
          fromAgentName: "Analyst",
          toAgentName: "Writer",
          toAgentId: "agent-2",
          contentPreview: "From Analyst",
        }),
      ],
      reflections: EMPTY_REFLECTIONS,
      agentFilter: "agent-1",
      agentBoard: AGENT_BOARD,
    });

    expect(entries).toHaveLength(1);
    const comms = entries[0] as Extract<ChatEntry, { type: "comms" }>;
    expect(comms.data.fromAgentName).toBe("Researcher");
  });

  it("filters reflections by agent id", () => {
    const entries = projectChatFeed({
      events: [],
      messages: EMPTY_MESSAGES,
      reflections: [
        reflectionItem({
          timestamp: BASE_TS,
          agentId: "agent-1",
          agentName: "Researcher",
        }),
        reflectionItem({
          timestamp: BASE_TS + 1000,
          entryId: "ref-other",
          agentId: "agent-2",
          agentName: "Writer",
        }),
      ],
      agentFilter: "agent-1",
      agentBoard: AGENT_BOARD,
    });

    expect(entries).toHaveLength(1);
    const ref = entries[0] as Extract<ChatEntry, { type: "reflection" }>;
    expect(ref.data.agentName).toBe("Researcher");
  });

  it("filters out agent_message_sent events (uses messages source instead)", () => {
    const entries = projectChatFeed({
      events: [
        ledgerItem({
          eventType: "agent_message_sent",
          timestamp: BASE_TS,
          agentName: "Researcher",
          payload: { agentId: "agent-1", body: "Hello" },
        }),
      ],
      messages: EMPTY_MESSAGES,
      reflections: EMPTY_REFLECTIONS,
      agentFilter: null,
      agentBoard: AGENT_BOARD,
    });

    expect(entries).toHaveLength(0);
  });

  it("filters out agent_reflection events (uses reflections source instead)", () => {
    const entries = projectChatFeed({
      events: [
        ledgerItem({
          eventType: "agent_reflection",
          timestamp: BASE_TS,
          agentName: "Researcher",
          payload: { agentId: "agent-1", content: "Reconsidering approach" },
        }),
      ],
      messages: EMPTY_MESSAGES,
      reflections: EMPTY_REFLECTIONS,
      agentFilter: null,
      agentBoard: AGENT_BOARD,
    });

    expect(entries).toHaveLength(0);
  });

  it("merges consecutive reflections from same agent within window", () => {
    const entries = projectChatFeed({
      events: [],
      messages: EMPTY_MESSAGES,
      reflections: [
        reflectionItem({
          timestamp: BASE_TS,
          agentId: "agent-1",
          agentName: "Researcher",
          score: 0.6,
          verbalMemory: "Early progress",
        }),
        reflectionItem({
          timestamp: BASE_TS + 2000,
          entryId: "ref-2",
          agentId: "agent-1",
          agentName: "Researcher",
          score: 0.75,
          verbalMemory: "Better now",
        }),
        reflectionItem({
          timestamp: BASE_TS + 4000,
          entryId: "ref-3",
          agentId: "agent-1",
          agentName: "Researcher",
          score: 0.85,
          verbalMemory: "Almost done",
        }),
      ],
      agentFilter: null,
      agentBoard: AGENT_BOARD,
    });

    expect(entries).toHaveLength(1);
    const ref = entries[0] as Extract<ChatEntry, { type: "reflection" }>;
    expect(ref.data.score).toBe(0.85);
    expect(ref.data.verbalMemory).toBe("Almost done");
  });

  it("does not merge reflections from different agents", () => {
    const entries = projectChatFeed({
      events: [],
      messages: EMPTY_MESSAGES,
      reflections: [
        reflectionItem({
          timestamp: BASE_TS,
          agentId: "agent-1",
          agentName: "Researcher",
          score: 0.7,
        }),
        reflectionItem({
          timestamp: BASE_TS + 1000,
          entryId: "ref-w",
          agentId: "agent-2",
          agentName: "Writer",
          score: 0.8,
        }),
      ],
      agentFilter: null,
      agentBoard: AGENT_BOARD,
    });

    expect(entries).toHaveLength(2);
  });

  it("preserves triggeredReplan when merging reflections", () => {
    const entries = projectChatFeed({
      events: [],
      messages: EMPTY_MESSAGES,
      reflections: [
        reflectionItem({
          timestamp: BASE_TS,
          agentId: "agent-1",
          agentName: "Researcher",
          score: 0.3,
          triggeredReplan: true,
          verbalMemory: "Stuck, need to replan",
        }),
        reflectionItem({
          timestamp: BASE_TS + 2000,
          entryId: "ref-2",
          agentId: "agent-1",
          agentName: "Researcher",
          score: 0.5,
          triggeredReplan: false,
          verbalMemory: "Recovering",
        }),
      ],
      agentFilter: null,
      agentBoard: AGENT_BOARD,
    });

    expect(entries).toHaveLength(1);
    const ref = entries[0] as Extract<ChatEntry, { type: "reflection" }>;
    expect(ref.data.triggeredReplan).toBe(true);
    expect(ref.data.score).toBe(0.5);
  });

  it("resolves agent name from agentBoard when reflection has raw ID", () => {
    const entries = projectChatFeed({
      events: [],
      messages: EMPTY_MESSAGES,
      reflections: [
        reflectionItem({
          timestamp: BASE_TS,
          agentId: "agent-1",
          agentName: "cmll28u1x0004vn5ivkbxw3q9",
          score: 0.6,
          verbalMemory: "Working on it",
        }),
      ],
      agentFilter: null,
      agentBoard: AGENT_BOARD,
    });

    expect(entries).toHaveLength(1);
    const ref = entries[0] as Extract<ChatEntry, { type: "reflection" }>;
    expect(ref.data.agentName).toBe("Researcher");
  });

  it("falls back to raw agentName when not in agentBoard", () => {
    const entries = projectChatFeed({
      events: [],
      messages: EMPTY_MESSAGES,
      reflections: [
        reflectionItem({
          timestamp: BASE_TS,
          agentId: "unknown-agent",
          agentName: "Fallback Name",
          score: 0.5,
        }),
      ],
      agentFilter: null,
      agentBoard: AGENT_BOARD,
    });

    expect(entries).toHaveLength(1);
    const ref = entries[0] as Extract<ChatEntry, { type: "reflection" }>;
    expect(ref.data.agentName).toBe("Fallback Name");
  });

  it("shows broadcast messages with null toAgentName", () => {
    const entries = projectChatFeed({
      events: [],
      messages: [
        messageItem({
          timestamp: BASE_TS,
          fromAgentName: "Orchestrator",
          toAgentId: null,
          toAgentName: null,
          channel: "broadcast",
          contentPreview: "All agents pause",
        }),
      ],
      reflections: EMPTY_REFLECTIONS,
      agentFilter: null,
      agentBoard: AGENT_BOARD,
    });

    expect(entries).toHaveLength(1);
    const comms = entries[0] as Extract<ChatEntry, { type: "comms" }>;
    expect(comms.data.channel).toBe("broadcast");
    expect(comms.data.toAgentName).toBeNull();
  });
});

describe("computeFingerprint", () => {
  it("captures array lengths and last timestamps", () => {
    const { computeFingerprint } = require("../chat-projection");

    const fp = computeFingerprint({
      events: [
        ledgerItem({ eventType: "run.started", timestamp: BASE_TS }),
        ledgerItem({ eventType: "run.completed", timestamp: BASE_TS + 5000 }),
      ],
      messages: [messageItem({ timestamp: BASE_TS + 1000 })],
      reflections: [reflectionItem({ timestamp: BASE_TS + 2000 })],
      agentFilter: null,
      agentBoard: AGENT_BOARD,
    });

    expect(fp.eventCount).toBe(2);
    expect(fp.lastEventTs).toBe(BASE_TS + 5000);
    expect(fp.messageCount).toBe(1);
    expect(fp.lastMessageTs).toBe(BASE_TS + 1000);
    expect(fp.reflectionCount).toBe(1);
    expect(fp.lastReflectionTs).toBe(BASE_TS + 2000);
    expect(fp.agentFilter).toBeNull();
    expect(fp.agentKeyCount).toBe(2);
  });

  it("returns zeros for empty arrays", () => {
    const { computeFingerprint } = require("../chat-projection");

    const fp = computeFingerprint({
      events: [],
      messages: EMPTY_MESSAGES,
      reflections: EMPTY_REFLECTIONS,
      agentFilter: "agent-1",
      agentBoard: {},
    });

    expect(fp.eventCount).toBe(0);
    expect(fp.lastEventTs).toBe(0);
    expect(fp.messageCount).toBe(0);
    expect(fp.lastMessageTs).toBe(0);
    expect(fp.reflectionCount).toBe(0);
    expect(fp.lastReflectionTs).toBe(0);
    expect(fp.agentFilter).toBe("agent-1");
    expect(fp.agentKeyCount).toBe(0);
  });
});

describe("fingerprintsEqual", () => {
  it("returns true for identical fingerprints", () => {
    const { fingerprintsEqual } = require("../chat-projection");

    const fp = {
      eventCount: 5,
      lastEventTs: 1000,
      messageCount: 3,
      lastMessageTs: 2000,
      reflectionCount: 1,
      lastReflectionTs: 3000,
      agentFilter: null,
      agentKeyCount: 4,
    };

    expect(fingerprintsEqual(fp, { ...fp })).toBe(true);
  });

  it("returns false when event count differs", () => {
    const { fingerprintsEqual } = require("../chat-projection");

    const base = {
      eventCount: 5,
      lastEventTs: 1000,
      messageCount: 3,
      lastMessageTs: 2000,
      reflectionCount: 1,
      lastReflectionTs: 3000,
      agentFilter: null,
      agentKeyCount: 4,
    };

    expect(fingerprintsEqual(base, { ...base, eventCount: 6 })).toBe(false);
  });

  it("returns false when agentFilter differs", () => {
    const { fingerprintsEqual } = require("../chat-projection");

    const base = {
      eventCount: 5,
      lastEventTs: 1000,
      messageCount: 3,
      lastMessageTs: 2000,
      reflectionCount: 1,
      lastReflectionTs: 3000,
      agentFilter: null as string | null,
      agentKeyCount: 4,
    };

    expect(fingerprintsEqual(base, { ...base, agentFilter: "agent-1" })).toBe(
      false
    );
  });

  it("returns false when agentKeyCount differs", () => {
    const { fingerprintsEqual } = require("../chat-projection");

    const base = {
      eventCount: 5,
      lastEventTs: 1000,
      messageCount: 3,
      lastMessageTs: 2000,
      reflectionCount: 1,
      lastReflectionTs: 3000,
      agentFilter: null,
      agentKeyCount: 4,
    };

    expect(fingerprintsEqual(base, { ...base, agentKeyCount: 5 })).toBe(false);
  });
});

describe("createChatProjectionCache", () => {
  it("returns same reference when fingerprint is unchanged", () => {
    const { createChatProjectionCache } = require("../chat-projection");
    const project = createChatProjectionCache();

    const input = {
      events: [
        ledgerItem({
          eventType: "agent_step_completed",
          timestamp: BASE_TS,
          agentName: "Researcher",
          payload: { agentId: "agent-1", summary: "Found data" },
        }),
      ],
      messages: EMPTY_MESSAGES,
      reflections: EMPTY_REFLECTIONS,
      agentFilter: null,
      agentBoard: AGENT_BOARD,
    };

    const result1 = project(input);
    const result2 = project(input);

    expect(result1).toBe(result2);
  });

  it("recomputes when event count changes", () => {
    const { createChatProjectionCache } = require("../chat-projection");
    const project = createChatProjectionCache();

    const events = [
      ledgerItem({
        eventType: "agent_step_completed",
        timestamp: BASE_TS,
        agentName: "Researcher",
        payload: { agentId: "agent-1", summary: "Part 1" },
      }),
    ];

    const result1 = project({
      events,
      messages: EMPTY_MESSAGES,
      reflections: EMPTY_REFLECTIONS,
      agentFilter: null,
      agentBoard: AGENT_BOARD,
    });

    const newEvents = [
      ...events,
      ledgerItem({
        eventType: "agent_step_completed",
        timestamp: BASE_TS + 1000,
        agentName: "Researcher",
        payload: { agentId: "agent-1", summary: "Part 2" },
      }),
    ];

    const result2 = project({
      events: newEvents,
      messages: EMPTY_MESSAGES,
      reflections: EMPTY_REFLECTIONS,
      agentFilter: null,
      agentBoard: AGENT_BOARD,
    });

    expect(result1).not.toBe(result2);
  });

  it("does not recompute when only agent status changes", () => {
    const { createChatProjectionCache } = require("../chat-projection");
    const project = createChatProjectionCache();

    const events = [
      ledgerItem({
        eventType: "agent_step_completed",
        timestamp: BASE_TS,
        agentName: "Researcher",
        payload: { agentId: "agent-1", summary: "Working" },
      }),
    ];

    const board1 = {
      "agent-1": { agentName: "Researcher", role: "research" },
      "agent-2": { agentName: "Writer", role: "writing" },
    };

    const result1 = project({
      events,
      messages: EMPTY_MESSAGES,
      reflections: EMPTY_REFLECTIONS,
      agentFilter: null,
      agentBoard: board1,
    });

    const board2 = {
      "agent-1": { agentName: "Researcher", role: "research" },
      "agent-2": { agentName: "Writer", role: "writing" },
    };

    const result2 = project({
      events,
      messages: EMPTY_MESSAGES,
      reflections: EMPTY_REFLECTIONS,
      agentFilter: null,
      agentBoard: board2,
    });

    expect(result1).toBe(result2);
  });

  it("recomputes when new agent added to board", () => {
    const { createChatProjectionCache } = require("../chat-projection");
    const project = createChatProjectionCache();

    const events = [
      ledgerItem({
        eventType: "agent_step_completed",
        timestamp: BASE_TS,
        agentName: "Researcher",
        payload: { agentId: "agent-1", summary: "Working" },
      }),
    ];

    const result1 = project({
      events,
      messages: EMPTY_MESSAGES,
      reflections: EMPTY_REFLECTIONS,
      agentFilter: null,
      agentBoard: AGENT_BOARD,
    });

    const extendedBoard = {
      ...AGENT_BOARD,
      "agent-3": { agentName: "Reviewer" },
    };

    const result2 = project({
      events,
      messages: EMPTY_MESSAGES,
      reflections: EMPTY_REFLECTIONS,
      agentFilter: null,
      agentBoard: extendedBoard,
    });

    expect(result1).not.toBe(result2);
  });

  it("recomputes when agentFilter changes", () => {
    const { createChatProjectionCache } = require("../chat-projection");
    const project = createChatProjectionCache();

    const events = [
      ledgerItem({
        eventType: "agent_step_completed",
        timestamp: BASE_TS,
        agentName: "Researcher",
        payload: { agentId: "agent-1", summary: "Working" },
      }),
    ];

    const input = {
      events,
      messages: EMPTY_MESSAGES,
      reflections: EMPTY_REFLECTIONS,
      agentBoard: AGENT_BOARD,
    };

    const result1 = project({ ...input, agentFilter: null });
    const result2 = project({ ...input, agentFilter: "agent-1" });

    expect(result1).not.toBe(result2);
  });

  it("first call always computes fresh result", () => {
    const { createChatProjectionCache } = require("../chat-projection");
    const project = createChatProjectionCache();

    const result = project({
      events: [],
      messages: EMPTY_MESSAGES,
      reflections: EMPTY_REFLECTIONS,
      agentFilter: null,
      agentBoard: AGENT_BOARD,
    });

    expect(result).toEqual([]);
  });
});
